import pkg from 'whatsapp-web.js';
const { Client, RemoteAuth } = pkg;
import { MongoStore } from 'wwebjs-mongo';
import mongoose from 'mongoose';
import qrcode from 'qrcode-terminal';
import { format } from 'date-fns';

// ── State ──────────────────────────────────────────────────────────────────
let clientStatus = 'DISCONNECTED'; // DISCONNECTED | QR_READY | AUTHENTICATED | READY | AUTH_FAILURE
let currentQR = null;
let whatsappClient = null;

// ── Client Initialization ──────────────────────────────────────────────────

/**
 * Initializes the WhatsApp Web client with persistent MongoDB session.
 * Call this once on server startup. The client emits events internally.
 */
export const initWhatsApp = () => {
  console.log('[WhatsApp] Initializing client with RemoteAuth (MongoDB)...');

  // Fix for wwebjs-mongo compatibility with Mongoose v8/9
  // Mongoose connection.db can be undefined on first boot depending on the connection string
  const store = new MongoStore({ 
    mongoose: { 
      mongo: mongoose.mongo,
      connection: {
        ...mongoose.connection,
        db: mongoose.connection.db || mongoose.connection.getClient().db()
      }
    } 
  });

  whatsappClient = new Client({
    authStrategy: new RemoteAuth({
      store: store,
      backupSyncIntervalMs: 300000 // Save to DB every 5 mins if changed
    }),
    puppeteer: {
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--single-process', // Aggressively saves memory
        '--disable-software-rasterizer',
        '--mute-audio',
        '--disable-extensions',
        '--js-flags="--max-old-space-size=256"' // Limit Chromium V8 heap
      ],
    },
  });

  // ── Event: QR Code ─────────────────────────────────────────────────────
  whatsappClient.on('qr', (qr) => {
    currentQR = qr;
    clientStatus = 'QR_READY';
    console.log('\n[WhatsApp] Scan the QR code below with your WhatsApp → Linked Devices:\n');
    qrcode.generate(qr, { small: true });
    console.log('\n[WhatsApp] Waiting for scan...');
  });

  // ── Event: Authenticated ────────────────────────────────────────────────
  whatsappClient.on('authenticated', () => {
    clientStatus = 'AUTHENTICATED';
    currentQR = null;
    console.log('[WhatsApp] ✅ Authenticated successfully! Session saved to disk.');
  });

  // ── Event: Ready ────────────────────────────────────────────────────────
  whatsappClient.on('ready', () => {
    clientStatus = 'READY';
    currentQR = null;
    console.log('[WhatsApp] ✅ Client is ready! Thank-you messages will now be sent automatically.');
  });

  // ── Event: Auth Failure ─────────────────────────────────────────────────
  whatsappClient.on('auth_failure', (message) => {
    clientStatus = 'AUTH_FAILURE';
    console.error('[WhatsApp] ❌ Authentication failed:', message);
  });

  // ── Event: Remote Session Saved ─────────────────────────────────────────
  whatsappClient.on('remote_session_saved', () => {
    console.log('[WhatsApp] 💾 Remote session saved to MongoDB successfully.');
  });

  // ── Event: Disconnected ─────────────────────────────────────────────────
  whatsappClient.on('disconnected', (reason) => {
    clientStatus = 'DISCONNECTED';
    console.warn('[WhatsApp] ⚠️  Client disconnected:', reason);
    console.log('[WhatsApp] Attempting to reconnect in 10 seconds...');
    // Auto-reconnect after 10 seconds
    setTimeout(() => {
      console.log('[WhatsApp] Reconnecting...');
      whatsappClient.initialize();
    }, 10000);
  });

  whatsappClient.initialize();
};

// ── Status Helpers ─────────────────────────────────────────────────────────

export const getWhatsAppStatus = () => ({
  status: clientStatus,
  isReady: clientStatus === 'READY',
  hasQR: clientStatus === 'QR_READY',
  qr: currentQR,
});

// ── Message Sender ─────────────────────────────────────────────────────────

/**
 * Format a phone number for WhatsApp.
 * Strips spaces/dashes, adds India (+91) country code if not present.
 * WhatsApp requires: <country_code><number>@c.us
 */
const formatPhoneForWhatsApp = (phone) => {
  // Strip all non-digit characters
  let digits = phone.replace(/\D/g, '');

  // If 10 digits, assume Indian number and prepend country code
  if (digits.length === 10) {
    digits = `91${digits}`;
  }

  return `${digits}@c.us`;
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
    const chatId = formatPhoneForWhatsApp(phone);
    const message = buildThankYouMessage(donorName, amount, date);

    await whatsappClient.sendMessage(chatId, message);
    console.log(`[WhatsApp] ✅ Thank-you message sent to ${phone} (${donorName})`);
  } catch (error) {
    console.error(`[WhatsApp] ❌ Failed to send message to ${phone}:`, error.message);
  }
};
