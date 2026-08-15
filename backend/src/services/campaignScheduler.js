import axios from 'axios';
import { MessageLog } from '../models/MessageLog.js';

const API_VERSION = process.env.WHATSAPP_API_VERSION || 'v21.0';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const BASE_URL = `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}`;

const getHeaders = () => ({
  Authorization: `Bearer ${ACCESS_TOKEN}`,
  'Content-Type': 'application/json',
});

const formatPhone = (phone) => {
  let digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    digits = `91${digits}`;
  }
  return digits;
};

// Configuration
const BATCH_SIZE = 5;           // Messages per batch
const DELAY_BETWEEN_MSGS = 3000; // 3s between individual messages
const POLL_INTERVAL = 15000;     // Check for queued messages every 15s
const MAX_RETRIES = 2;           // Retry failed messages up to 2 times
const RATE_LIMIT_PAUSE = 60000;  // Pause 60s if rate limited

let isProcessing = false;

/**
 * Send a single queued message to Meta API.
 * Updates the MessageLog entry with the result.
 */
const processMessage = async (log) => {
  const formattedPhone = formatPhone(log.recipientPhone);
  const components = [];

  if (log.bodyParams && log.bodyParams.length > 0) {
    components.push({
      type: 'body',
      parameters: log.bodyParams.map(param => ({ type: 'text', text: String(param) })),
    });
  }

  const messagePayload = {
    messaging_product: 'whatsapp',
    to: formattedPhone,
    type: 'template',
    template: {
      name: log.templateName,
      language: { code: log.languageCode || 'en' },
      ...(components.length > 0 ? { components } : {}),
    },
  };

  try {
    const response = await axios.post(`${BASE_URL}/messages`, messagePayload, { headers: getHeaders() });

    log.waMessageId = response.data?.messages?.[0]?.id;
    log.status = 'sent';
    log.sentAt = new Date();
    await log.save();
    console.log(`[Worker] ✅ Sent to ${formattedPhone} (wamid: ${log.waMessageId})`);
    return { success: true };
  } catch (error) {
    const errData = error.response?.data?.error || {};
    const errorCode = String(errData.code || error.response?.status || 'UNKNOWN');

    // Check if rate limited (Meta error code 131056 or HTTP 429)
    if (errorCode === '131056' || error.response?.status === 429) {
      console.warn(`[Worker] ⚠️ Rate limited. Pausing for ${RATE_LIMIT_PAUSE / 1000}s...`);
      return { success: false, rateLimited: true };
    }

    // Increment retry count
    const retryCount = (log.retryCount || 0) + 1;
    if (retryCount <= MAX_RETRIES) {
      // Put back to queued for retry
      log.retryCount = retryCount;
      log.status = 'queued';
      await log.save();
      console.warn(`[Worker] ⚠️ Retry ${retryCount}/${MAX_RETRIES} for ${formattedPhone}: ${errData.message || error.message}`);
      return { success: false, retry: true };
    }

    // Max retries reached — mark as failed
    log.status = 'failed';
    log.failedAt = new Date();
    log.errorCode = errorCode;
    log.errorMessage = errData.message || error.message;
    await log.save();
    console.error(`[Worker] ❌ Failed permanently for ${formattedPhone}: ${log.errorMessage}`);
    return { success: false };
  }
};

/**
 * Process a batch of queued/scheduled messages.
 */
const processBatch = async () => {
  if (isProcessing) return;
  isProcessing = true;

  try {
    // First: move scheduled messages that are due to 'queued'
    await MessageLog.updateMany(
      { status: 'scheduled', scheduledAt: { $lte: new Date() } },
      { $set: { status: 'queued' } }
    );

    // Fetch next batch of queued messages
    const messages = await MessageLog.find({ status: 'queued' })
      .sort({ createdAt: 1 })
      .limit(BATCH_SIZE);

    if (messages.length === 0) {
      isProcessing = false;
      return;
    }

    console.log(`[Worker] 📦 Processing batch of ${messages.length} messages...`);

    for (const msg of messages) {
      const result = await processMessage(msg);

      if (result.rateLimited) {
        // Stop processing this batch, wait before next attempt
        console.log(`[Worker] ⏸️ Rate limited — pausing batch processing.`);
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_PAUSE));
        break;
      }

      // Delay between messages to respect Meta's throughput
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_MSGS));
    }
  } catch (error) {
    console.error('[Worker] ❌ Batch processing error:', error.message);
  } finally {
    isProcessing = false;
  }
};

/**
 * Start the background campaign worker.
 * Polls MongoDB every POLL_INTERVAL for queued messages.
 */
export const startCampaignScheduler = () => {
  console.log(`[Worker] 🚀 Campaign worker started (poll: ${POLL_INTERVAL / 1000}s, batch: ${BATCH_SIZE}, delay: ${DELAY_BETWEEN_MSGS / 1000}s)`);

  setInterval(async () => {
    await processBatch();
  }, POLL_INTERVAL);

  // Also run once immediately on startup to process any leftover queued messages
  setTimeout(() => processBatch(), 5000);
};
