import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import QRCode from 'qrcode';
import { format } from 'date-fns';
import path from 'path';
import { fileURLToPath } from 'url';

// ── Logger ─────────────────────────────────────────────────────────────────
const logger = pino({ level: 'silent' }); // Baileys is very chatty — suppress its logs

// ── Paths ──────────────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = path.join(__dirname, '..', '..', 'auth_info');

// ── State ──────────────────────────────────────────────────────────────────
let clientStatus = 'DISCONNECTED'; // DISCONNECTED | QR_READY | AUTHENTICATED | READY | AUTH_FAILURE
let currentQR = null;       // raw QR string
let currentQRDataUrl = null; // base64 data-URL for <img> rendering
let sock = null;

// ── Client Initialization ──────────────────────────────────────────────────

/**
 * Initializes the WhatsApp client using Baileys (multi-device WebSocket).
 * Call this once on server startup after MongoDB is connected.
 */
export const initWhatsApp = async () => {
  console.log('[WhatsApp] Initializing Baileys client...');

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
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

      const loggedOut = statusCode === DisconnectReason.loggedOut;

      if (loggedOut) {
        clientStatus = 'AUTH_FAILURE';
        console.error('[WhatsApp] ❌ Session logged out. Please delete auth_info/ and restart to re-authenticate.');
      } else {
        clientStatus = 'DISCONNECTED';
        console.warn(`[WhatsApp] ⚠️  Connection closed (code: ${statusCode}). Reconnecting in 5 seconds...`);
        // Auto-reconnect for non-logout disconnections
        setTimeout(() => {
          console.log('[WhatsApp] Reconnecting...');
          initWhatsApp();
        }, 5000);
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
 * Build the personalised thank-you message.
 */
const buildThankYouMessage = (donorName, amount, donationDate) => {
  const formattedDate = format(new Date(donationDate), 'dd MMM yyyy');
  const formattedAmount = `₹${Number(amount).toLocaleString('en-IN')}`;

  return (
    `🙏 *Thank You, ${donorName}!*\n\n` +
    `Your generous donation of *${formattedAmount}* has been received and registered on ${formattedDate}.\n\n` +
    `Your contribution makes a real difference to our cause. We are deeply grateful for your heartfelt support.\n\n` +
    `With warm regards,\n` +
    `*Charity Society Registry* 🌿`
  );
};

/**
 * Send a WhatsApp thank-you message to a donor.
 * This is a non-blocking, fire-and-forget function.
 * It will NOT throw — failures are logged but never propagate to the caller.
 *
 * @param {string} phone      - Donor phone number (10 digits or with country code)
 * @param {string} donorName  - Donor's full name
 * @param {number} amount     - Donated amount in INR
 * @param {Date|string} date  - Donation date
 */
export const sendThankYouMessage = async (phone, donorName, amount, date) => {
  if (clientStatus !== 'READY') {
    console.warn(
      `[WhatsApp] Skipping thank-you message to ${phone}: client not ready (status: ${clientStatus})`
    );
    return;
  }

  try {
    const jid = formatPhoneForWhatsApp(phone);
    const message = buildThankYouMessage(donorName, amount, date);

    await sock.sendMessage(jid, { text: message });
    console.log(`[WhatsApp] ✅ Thank-you message sent to ${phone} (${donorName})`);
  } catch (error) {
    console.error(`[WhatsApp] ❌ Failed to send message to ${phone}:`, error.message);
  }
};
