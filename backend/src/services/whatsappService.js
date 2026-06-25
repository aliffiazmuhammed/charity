import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import QRCode from 'qrcode';
import { format as fnsFormat } from 'date-fns';
import { useMongoDBAuthState } from '../utils/mongoAuthState.js';
import { WhatsAppAuth } from '../models/WhatsAppAuth.js';

// ── Logger ─────────────────────────────────────────────────────────────────
const logger = pino({ level: 'silent' }); // Baileys is very chatty — suppress its logs

// ── State ──────────────────────────────────────────────────────────────────
let clientStatus = 'DISCONNECTED'; // DISCONNECTED | QR_READY | AUTHENTICATED | READY | AUTH_FAILURE
let currentQR = null;       // raw QR string
let currentQRDataUrl = null; // base64 data-URL for <img> rendering
let sock = null;
let saveCreds = null;        // keep a reference so we can flush creds before reconnect

// ── Client Initialization ──────────────────────────────────────────────────

/**
 * Initializes the WhatsApp client using Baileys (multi-device WebSocket).
 * Call this once on server startup after MongoDB is connected.
 */
export const initWhatsApp = async () => {
  console.log('[WhatsApp] Initializing Baileys client...');

  const { state, saveCreds: _saveCreds } = await useMongoDBAuthState();
  saveCreds = _saveCreds;       // store reference for use in disconnect handler
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    logger,
    printQRInTerminal: true,          // Also print QR in terminal as fallback
    generateHighQualityLinkPreview: false,
    markOnlineOnConnect: false,       // Don't mark as "online" — this is a server
  });

  // ── Event: Credentials Update ──────────────────────────────────────────
  sock.ev.on('creds.update', saveCreds);

  // ── Event: Connection Update ───────────────────────────────────────────
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // QR code received — waiting for scan
    if (qr) {
      currentQR = qr;
      try {
        currentQRDataUrl = await QRCode.toDataURL(qr);
      } catch {
        currentQRDataUrl = null;
      }
      clientStatus = 'QR_READY';
      console.log('[WhatsApp] QR code generated — scan with WhatsApp → Linked Devices');
    }

    // Connection opened
    if (connection === 'open') {
      clientStatus = 'READY';
      currentQR = null;
      currentQRDataUrl = null;
      console.log('[WhatsApp] ✅ Client is ready! Thank-you messages will now be sent automatically.');
    }

    // Connection closed
    if (connection === 'close') {
      currentQR = null;
      currentQRDataUrl = null;

      const statusCode = (lastDisconnect?.error instanceof Boom)
        ? lastDisconnect.error.output?.statusCode
        : lastDisconnect?.error?.output?.statusCode;

      console.log(`[WhatsApp] Connection closed with status code: ${statusCode}`);

      // Only treat status 401 (loggedOut) as a true logout that requires wiping creds.
      // Other codes (408 timeout, 428 connection lost, 500 internal, 503 unavailable,
      // 515 restart required) are all recoverable — just reconnect with existing session.
      if (statusCode === DisconnectReason.loggedOut) {
        clientStatus = 'DISCONNECTED';
        console.log('[WhatsApp] ❌ Session logged out by user. Clearing auth state and generating fresh QR...');
        try {
          await WhatsAppAuth.deleteMany({});
          console.log('[WhatsApp] 🗑️  Auth state cleared from MongoDB');
        } catch (err) {
          console.error('[WhatsApp] Failed to delete MongoDB auth state:', err.message);
        }
        // Restart to generate a fresh QR code
        setTimeout(() => {
          initWhatsApp();
        }, 3000);
      } else {
        clientStatus = 'DISCONNECTED';

        // Flush credentials to MongoDB before reconnecting — this ensures
        // any in-memory cred updates are persisted even if the container
        // restarts between now and the reconnect.
        try {
          if (saveCreds) {
            await saveCreds();
            console.log('[WhatsApp] 💾 Credentials flushed to MongoDB before reconnect');
          }
        } catch (err) {
          console.error('[WhatsApp] ⚠️  Failed to flush credentials before reconnect:', err.message);
        }

        const delay = statusCode === DisconnectReason.restartRequired ? 1000 : 5000;
        console.log(`[WhatsApp] ⚠️  Recoverable disconnect (code: ${statusCode}). Reconnecting in ${delay / 1000}s...`);

        setTimeout(() => {
          console.log('[WhatsApp] Reconnecting...');
          initWhatsApp();
        }, delay);
      }
    }
  });
};

// ── Status Helpers ─────────────────────────────────────────────────────────

export const getWhatsAppStatus = () => ({
  status: clientStatus,
  isReady: clientStatus === 'READY',
  hasQR: clientStatus === 'QR_READY',
  qr: currentQR,
  qrDataUrl: currentQRDataUrl,
});

// ── Message Sender ─────────────────────────────────────────────────────────

/**
 * Format a phone number for WhatsApp (Baileys format).
 * Strips spaces/dashes, adds India (+91) country code if not present.
 * Baileys requires: <country_code><number>@s.whatsapp.net
 */
const formatPhoneForWhatsApp = (phone) => {
  // Strip all non-digit characters
  let digits = phone.replace(/\D/g, '');

  // If 10 digits, assume Indian number and prepend country code
  if (digits.length === 10) {
    digits = `91${digits}`;
  }

  return `${digits}@s.whatsapp.net`;
};

/**
 * Build a message by interpolating placeholders in a template body.
 * Supported placeholders: {{donorName}}, {{amount}}, {{date}}
 *
 * @param {string} templateBody - The template string with placeholders
 * @param {string} donorName   - Donor's full name
 * @param {number} amount      - Donated amount in INR
 * @param {Date|string} date   - Donation date
 * @returns {string} The interpolated message
 */
const buildMessageFromTemplate = (templateBody, donorName, amount, date) => {
  const formattedDate = fnsFormat(new Date(date), 'dd MMM yyyy');
  const formattedAmount = `₹${Number(amount).toLocaleString('en-IN')}`;

  return templateBody
    .replace(/\{\{donorName\}\}/g, donorName)
    .replace(/\{\{amount\}\}/g, formattedAmount)
    .replace(/\{\{date\}\}/g, formattedDate);
};

/**
 * Send a WhatsApp message to a donor using a template.
 * This is a non-blocking, fire-and-forget function.
 * It will NOT throw — failures are logged but never propagate to the caller.
 *
 * @param {string} phone         - Donor phone number (10 digits or with country code)
 * @param {string} donorName     - Donor's full name
 * @param {number} amount        - Donated amount in INR
 * @param {Date|string} date     - Donation date
 * @param {string} templateBody  - The template body with {{placeholders}}
 */
export const sendThankYouMessage = async (phone, donorName, amount, date, templateBody) => {
  if (!templateBody) {
    console.warn(`[WhatsApp] Skipping message to ${phone}: no active template`);
    return;
  }

  if (clientStatus !== 'READY') {
    console.warn(
      `[WhatsApp] Skipping message to ${phone}: client not ready (status: ${clientStatus})`
    );
    return;
  }

  try {
    const jid = formatPhoneForWhatsApp(phone);
    const message = buildMessageFromTemplate(templateBody, donorName, amount, date);

    await sock.sendMessage(jid, { text: message });
    console.log(`[WhatsApp] ✅ Message sent to ${phone} (${donorName})`);
  } catch (error) {
    console.error(`[WhatsApp] ❌ Failed to send message to ${phone}:`, error.message);
  }
};

/**
 * Manually logs out the current WhatsApp session.
 * This will trigger the 'loggedOut' disconnect event, which cleans up the directory and restarts.
 */
export const logoutWhatsApp = async () => {
  if (sock && clientStatus === 'READY') {
    console.log('[WhatsApp] Manually logging out current session...');
    await sock.logout();
  } else {
    throw new Error('WhatsApp is not currently connected.');
  }
};
