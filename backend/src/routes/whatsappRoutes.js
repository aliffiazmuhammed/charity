import express from 'express';
import { auth } from '../middleware/auth.js';
import {
  sendTemplateMessage,
  sendMediaMessage,
  sendBulkCampaignMessages,
  processWebhookPayload,
  getApiStatus,
  getMessageHistory,
  getMessageStats,
} from '../services/whatsappService.js';
import { MessageLog } from '../models/MessageLog.js';

const router = express.Router();

// ── Webhook Endpoints (NO auth — Meta calls these directly) ─────────

/**
 * GET /api/whatsapp/webhook
 * Meta webhook verification handshake (one-time setup).
 */
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    console.log('[Webhook] ✅ Verification successful');
    res.status(200).send(challenge);
  } else {
    console.warn('[Webhook] ❌ Verification failed — invalid token');
    res.sendStatus(403);
  }
});

/**
 * POST /api/whatsapp/webhook
 * Receive delivery status updates and incoming messages from Meta.
 * Must respond 200 immediately.
 */
router.post('/webhook', (req, res) => {
  // Always respond 200 immediately (Meta requirement — they retry on non-200)
  res.sendStatus(200);

  // Process asynchronously
  processWebhookPayload(req.body).catch(err => {
    console.error('[Webhook] Error processing payload:', err.message);
  });
});

// ── Protected Endpoints (require auth) ──────────────────────────────

/**
 * GET /api/whatsapp/status
 * Check Meta API connectivity and phone number registration status.
 */
router.get('/status', auth, async (req, res) => {
  try {
    const status = await getApiStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/whatsapp/send
 * Send a single template message.
 * Body: { phone, templateName, languageCode?, bodyParams?, headerParams?, mediaType?, mediaUrl? }
 */
router.post('/send', auth, async (req, res) => {
  try {
    const { phone, templateName, languageCode, bodyParams, headerParams, mediaType, mediaUrl } = req.body;

    if (!phone || !templateName) {
      return res.status(400).json({ error: 'phone and templateName are required' });
    }

    const options = {};
    if (headerParams) options.headerParams = headerParams;
    if (mediaType && mediaUrl) {
      options.mediaType = mediaType;
      options.mediaUrl = mediaUrl;
    }

    const log = await sendTemplateMessage(
      phone,
      templateName,
      languageCode || 'en',
      bodyParams || [],
      options,
      { messageType: 'custom' }
    );

    res.json({
      success: log.status !== 'failed',
      messageId: log.waMessageId,
      status: log.status,
      error: log.errorMessage,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/whatsapp/send-media
 * Send a media message (within 24h service window).
 * Body: { phone, mediaType, mediaUrl, caption?, filename? }
 */
router.post('/send-media', auth, async (req, res) => {
  try {
    const { phone, mediaType, mediaUrl, caption, filename } = req.body;

    if (!phone || !mediaType || !mediaUrl) {
      return res.status(400).json({ error: 'phone, mediaType, and mediaUrl are required' });
    }

    const log = await sendMediaMessage(phone, mediaType, mediaUrl, caption, filename);

    res.json({
      success: log.status !== 'failed',
      messageId: log.waMessageId,
      status: log.status,
      error: log.errorMessage,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/whatsapp/bulk-send
 * Send bulk campaign messages.
 * Body: { recipients: [{phone, name, params}], templateName, languageCode?, campaignId?, options? }
 */
router.post('/bulk-send', auth, async (req, res) => {
  try {
    const { recipients, templateName, languageCode, campaignId, options } = req.body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: 'recipients array is required and must not be empty' });
    }
    if (!templateName) {
      return res.status(400).json({ error: 'templateName is required' });
    }

    // Generate campaign ID if not provided
    const cid = campaignId || `campaign_${Date.now()}`;

    const results = await sendBulkCampaignMessages(
      recipients,
      templateName,
      languageCode || 'en',
      cid,
      options || {}
    );

    const summary = {
      campaignId: cid,
      total: results.length,
      sent: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
    };

    res.json({ summary, results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/whatsapp/messages
 * Get message history with status.
 * Query: page, limit, status, campaignId, phone
 */
router.get('/messages', auth, async (req, res) => {
  try {
    const { page, limit, status, campaignId, phone } = req.query;
    const result = await getMessageHistory({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50,
      status,
      campaignId,
      phone,
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/whatsapp/messages/stats
 * Get aggregate message delivery statistics.
 * Query: campaignId (optional)
 */
router.get('/messages/stats', auth, async (req, res) => {
  try {
    const stats = await getMessageStats(req.query.campaignId || null);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/whatsapp/messages/:id/status
 * Get delivery status of a specific message by its log ID.
 */
router.get('/messages/:id/status', auth, async (req, res) => {
  try {
    const log = await MessageLog.findById(req.params.id).lean();
    if (!log) {
      return res.status(404).json({ error: 'Message not found' });
    }
    res.json(log);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
