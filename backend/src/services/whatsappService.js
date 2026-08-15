import axios from 'axios';
import { MessageLog } from '../models/MessageLog.js';
import { MessageTemplate } from '../models/MessageTemplate.js';

const API_VERSION = process.env.WHATSAPP_API_VERSION || 'v21.0';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const BASE_URL = `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}`;
console.log(`[WhatsApp Service] Using API version: ${API_VERSION}, Phone Number ID: ${PHONE_NUMBER_ID}`);

/**
 * Get axios config with authorization header.
 */
const getHeaders = () => ({
  Authorization: `Bearer ${ACCESS_TOKEN}`,
  'Content-Type': 'application/json',
});

/**
 * Format phone number to international format for Meta API.
 * Supports multi-country — strips non-digits.
 * If 10 digits, assumes India (+91).
 * Meta API requires format: country_code + number (no + sign).
 */
const formatPhone = (phone) => {
  let digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    digits = `91${digits}`;
  }
  return digits;
};

/**
 * Core function to send any message via Meta Cloud API.
 * Creates a MessageLog entry and returns it.
 */
const sendToMeta = async (to, messagePayload, logData = {}) => {
  const formattedPhone = formatPhone(to);

  // Create log entry first
  const log = new MessageLog({
    recipientPhone: formattedPhone,
    status: 'queued',
    ...logData,
  });
  await log.save();

  try {
    const response = await axios.post(
      `${BASE_URL}/messages`,
      {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        ...messagePayload,
      },
      { headers: getHeaders() }
    );

    const waMessageId = response.data?.messages?.[0]?.id;
    log.waMessageId = waMessageId;
    log.status = 'sent';
    log.sentAt = new Date();
    await log.save();

    console.log(`[WhatsApp] ✅ Message sent to ${formattedPhone} (wamid: ${waMessageId})`);
    return log;
  } catch (error) {
    const errData = error.response?.data?.error || {};
    log.status = 'failed';
    log.failedAt = new Date();
    log.errorCode = String(errData.code || error.response?.status || 'UNKNOWN');
    log.errorMessage = errData.message || error.message;
    await log.save();

    console.error(`[WhatsApp] ❌ Failed to send to ${formattedPhone}:`, log.errorMessage);
    return log;
  }
};

/**
 * Send a template message (the primary way to message users via Meta API).
 * @param {string} phone - Recipient phone number
 * @param {string} templateName - Meta-approved template name (lowercase, underscores)
 * @param {string} languageCode - Template language (e.g., 'en', 'ml')
 * @param {Array} bodyParams - Array of strings for body parameter substitution
 * @param {Object} [options] - Optional: headerParams, mediaHeader, etc.
 * @param {Object} [logData] - Additional data for the MessageLog entry
 */
export const sendTemplateMessage = async (phone, templateName, languageCode = 'en', bodyParams = [], options = {}, logData = {}) => {
  const components = [];

  // Header component (if media or text header provided)
  if (options.headerParams) {
    const headerComponent = { type: 'header', parameters: [] };
    if (options.mediaType && options.mediaUrl) {
      // Media header (image, document, video)
      headerComponent.parameters.push({
        type: options.mediaType,
        [options.mediaType]: { link: options.mediaUrl },
      });
    } else if (options.headerParams.length > 0) {
      // Text header parameters
      options.headerParams.forEach(param => {
        headerComponent.parameters.push({ type: 'text', text: param });
      });
    }
    if (headerComponent.parameters.length > 0) {
      components.push(headerComponent);
    }
  }

  // Body component (parameter substitution)
  if (bodyParams.length > 0) {
    components.push({
      type: 'body',
      parameters: bodyParams.map(param => ({ type: 'text', text: String(param) })),
    });
  }

  const messagePayload = {
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      ...(components.length > 0 ? { components } : {}),
    },
  };

  return await sendToMeta(phone, messagePayload, {
    templateName,
    messageType: logData.messageType || 'custom',
    content: `Template: ${templateName} | Params: ${bodyParams.join(', ')}`,
    ...logData,
  });
};

/**
 * Send a thank-you message using the active Meta-approved template.
 * This is the main function called from donationRoutes when a donation is created.
 *
 * @param {string} phone - Donor phone number
 * @param {string} donorName - Donor's full name
 * @param {number} amount - Donation amount
 * @param {Date|string} date - Donation date
 * @param {string} [metaTemplateName] - Optional: override Meta template name
 */
export const sendThankYouMessage = async (phone, donorName, amount, date, metaTemplateName = null) => {
  try {
    // If no template name given, find the active template from DB
    let templateName = metaTemplateName;
    let languageCode = 'en';

    if (!templateName) {
      const activeTemplate = await MessageTemplate.findOne({ isActive: true, metaStatus: { $regex: /^approved$/i } });
      if (!activeTemplate) {
        console.warn(`[WhatsApp] Skipping thank-you to ${phone}: no active approved template`);
        return null;
      }
      templateName = activeTemplate.metaTemplateName;
      languageCode = activeTemplate.language || 'en';
    }

    if (!templateName) {
      console.warn(`[WhatsApp] Skipping thank-you to ${phone}: template has no Meta name`);
      return null;
    }

    // Format amount and date for template parameters
    const formattedAmount = `₹${Number(amount).toLocaleString('en-IN')}`;
    const formattedDate = new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    return await sendTemplateMessage(
      phone,
      templateName,
      languageCode,
      [donorName, formattedAmount, formattedDate],
      {},
      { messageType: 'thank_you', recipientName: donorName }
    );
  } catch (error) {
    console.error(`[WhatsApp] ❌ Failed to send thank-you to ${phone}:`, error.message);
    return null;
  }
};

/**
 * Send a media message (image, document, video, audio).
 * Can only be sent within the 24-hour customer service window.
 * @param {string} phone - Recipient phone
 * @param {string} mediaType - 'image' | 'document' | 'video' | 'audio'
 * @param {string} mediaUrl - Public URL of the media
 * @param {string} [caption] - Optional caption (for image/video)
 * @param {string} [filename] - Optional filename (for document)
 */
export const sendMediaMessage = async (phone, mediaType, mediaUrl, caption = '', filename = '', logData = {}) => {
  const mediaPayload = { link: mediaUrl };
  if (caption) mediaPayload.caption = caption;
  if (filename && mediaType === 'document') mediaPayload.filename = filename;

  const messagePayload = {
    type: mediaType,
    [mediaType]: mediaPayload,
  };

  return await sendToMeta(phone, messagePayload, {
    messageType: logData.messageType || 'custom',
    content: `Media (${mediaType}): ${mediaUrl}`,
    mediaUrl,
    mediaType,
    ...logData,
  });
};

/**
 * Send bulk campaign messages with rate limiting.
 * @param {Array} recipients - Array of { phone, name, params: {...} }
 * @param {string} templateName - Meta-approved template name
 * @param {string} languageCode - Template language code
 * @param {string} campaignId - Unique campaign identifier
 * @param {Object} [options] - Media header options
 * @param {number} [delayMs=2000] - Delay between messages in ms
 */
export const sendBulkCampaignMessages = async (recipients, templateName, languageCode = 'en', campaignId, campaignName, options = {}, delayMs = 2000, scheduledAt = null) => {
  if (scheduledAt && new Date(scheduledAt) > new Date()) {
    const logsToInsert = recipients.map(recipient => {
      const bodyParams = [];
      if (recipient.params) {
        if (Array.isArray(recipient.params)) {
          bodyParams.push(...recipient.params);
        } else {
          bodyParams.push(...Object.values(recipient.params));
        }
      }

      return {
        recipientPhone: formatPhone(recipient.phone),
        recipientName: recipient.name || '',
        templateName,
        messageType: 'campaign',
        content: `Template: ${templateName} | Params: ${bodyParams.join(', ')}`,
        status: 'scheduled',
        scheduledAt: new Date(scheduledAt),
        campaignId,
        campaignName,
        bodyParams,
        languageCode,
      };
    });

    try {
      const insertedLogs = await MessageLog.insertMany(logsToInsert);
      return insertedLogs.map(log => ({
        phone: log.recipientPhone,
        name: log.recipientName,
        success: true,
        status: 'scheduled',
        messageId: null,
        error: null,
      }));
    } catch (error) {
      console.error('[WhatsApp] ❌ Failed to insert scheduled messages:', error.message);
      throw error;
    }
  }

  const results = [];

  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i];
    try {
      // Build body parameters from recipient data
      const bodyParams = [];
      if (recipient.params) {
        // Params should be ordered: the caller defines the order
        if (Array.isArray(recipient.params)) {
          bodyParams.push(...recipient.params);
        } else {
          // If params is an object, convert values to array in order
          bodyParams.push(...Object.values(recipient.params));
        }
      }

      const log = await sendTemplateMessage(
        recipient.phone,
        templateName,
        languageCode,
        bodyParams,
        options,
        {
          messageType: 'campaign',
          recipientName: recipient.name || '',
          campaignId,
          campaignName,
        }
      );

      results.push({
        phone: recipient.phone,
        name: recipient.name,
        success: log.status !== 'failed',
        status: log.status,
        messageId: log.waMessageId,
        error: log.errorMessage,
      });
    } catch (error) {
      results.push({
        phone: recipient.phone,
        name: recipient.name,
        success: false,
        status: 'failed',
        error: error.message,
      });
    }

    // Rate limiting delay (skip after last message)
    if (i < recipients.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return results;
};

/**
 * Process webhook status updates from Meta.
 * Updates the MessageLog with delivery status.
 */
export const processWebhookPayload = async (payload) => {
  try {
    const entries = payload?.entry || [];
    for (const entry of entries) {
      const changes = entry?.changes || [];
      for (const change of changes) {
        const value = change?.value;
        if (!value) continue;

        // Process message status updates
        const statuses = value?.statuses || [];
        for (const status of statuses) {
          const waMessageId = status.id;
          const statusValue = status.status; // sent, delivered, read, failed
          const timestamp = status.timestamp ? new Date(Number(status.timestamp) * 1000) : new Date();

          const update = {};
          if (statusValue === 'sent') {
            update.status = 'sent';
            update.sentAt = timestamp;
          } else if (statusValue === 'delivered') {
            update.status = 'delivered';
            update.deliveredAt = timestamp;
          } else if (statusValue === 'read') {
            update.status = 'read';
            update.readAt = timestamp;
          } else if (statusValue === 'failed') {
            update.status = 'failed';
            update.failedAt = timestamp;
            const errors = status.errors || [];
            if (errors.length > 0) {
              update.errorCode = String(errors[0].code);
              update.errorMessage = errors[0].title || errors[0].message;
            }
          }

          if (Object.keys(update).length > 0) {
            await MessageLog.findOneAndUpdate(
              { waMessageId },
              { $set: update },
              { new: true }
            );
            console.log(`[WhatsApp Webhook] Status update: ${waMessageId} → ${statusValue}`);
          }
        }
      }
    }
  } catch (error) {
    console.error('[WhatsApp Webhook] Error processing payload:', error.message);
  }
};

/**
 * Check Meta API connectivity and phone number registration status.
 */
export const getApiStatus = async () => {
  try {
    if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
      return {
        status: 'NOT_CONFIGURED',
        isReady: false,
        message: 'WhatsApp API credentials not configured in .env',
      };
    }

    const response = await axios.get(
      `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}`,
      { headers: getHeaders() }
    );

    return {
      status: 'CONNECTED',
      isReady: true,
      phoneNumber: response.data.display_phone_number,
      qualityRating: response.data.quality_rating,
      verifiedName: response.data.verified_name,
    };
  } catch (error) {
    const errMsg = error.response?.data?.error?.message || error.message;
    return {
      status: 'ERROR',
      isReady: false,
      message: errMsg,
    };
  }
};

/**
 * Get message history from MessageLog.
 */
export const getMessageHistory = async ({ page = 1, limit = 50, status, campaignId, phone }) => {
  const filter = {};
  if (status) filter.status = status;
  if (campaignId) filter.campaignId = campaignId;
  if (phone) filter.recipientPhone = { $regex: phone, $options: 'i' };

  const skip = (page - 1) * limit;
  const [messages, total] = await Promise.all([
    MessageLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    MessageLog.countDocuments(filter),
  ]);

  return {
    messages,
    total,
    currentPage: parseInt(page),
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * Get message delivery statistics.
 */
export const getMessageStats = async (campaignId = null) => {
  const match = campaignId ? { campaignId } : {};

  const stats = await MessageLog.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const result = { total: 0, queued: 0, sent: 0, delivered: 0, read: 0, failed: 0 };
  for (const stat of stats) {
    result[stat._id] = stat.count;
    result.total += stat.count;
  }

  return result;
};
