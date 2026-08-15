import express from 'express';
import { sendBulkCampaignMessages, getMessageStats } from '../services/whatsappService.js';
import { MessageLog } from '../models/MessageLog.js';

const router = express.Router();

/**
 * POST /api/campaigns/send
 * Launch a bulk campaign with template + recipient list.
 * Body: {
 *   templateName: string (Meta-approved template name),
 *   languageCode?: string (default 'en'),
 *   recipients: [{ phone, name, params: string[] | object }],
 *   options?: { mediaType?, mediaUrl?, headerParams? }
 * }
 */
router.post('/send', async (req, res) => {
  try {
    const { templateName, languageCode, recipients, options, scheduledAt } = req.body;

    if (!templateName) {
      return res.status(400).json({ error: 'templateName is required' });
    }
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: 'recipients array is required and must not be empty' });
    }

    const campaignId = `campaign_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const results = await sendBulkCampaignMessages(
      recipients,
      templateName,
      languageCode || 'en',
      campaignId,
      options || {},
      2000,
      scheduledAt
    );

    const summary = {
      campaignId,
      total: results.length,
      sent: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      startedAt: new Date(),
    };

    res.json({ summary, results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/campaigns/history
 * List past campaigns with summary stats.
 * Returns unique campaign IDs with their message counts and statuses.
 */
router.get('/history', async (req, res) => {
  try {
    const campaigns = await MessageLog.aggregate([
      { $match: { campaignId: { $ne: null } } },
      {
        $group: {
          _id: '$campaignId',
          campaignId: { $first: '$campaignId' },
          templateName: { $first: '$templateName' },
          totalMessages: { $sum: 1 },
          sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
          delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
          read: { $sum: { $cond: [{ $eq: ['$status', 'read'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          startedAt: { $min: '$createdAt' },
          lastUpdated: { $max: '$updatedAt' },
        },
      },
      { $sort: { startedAt: -1 } },
    ]);

    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/campaigns/:campaignId/status
 * Get delivery stats and message list for a campaign.
 */
router.get('/:campaignId/status', async (req, res) => {
  try {
    const { campaignId } = req.params;

    const [stats, messages] = await Promise.all([
      getMessageStats(campaignId),
      MessageLog.find({ campaignId })
        .sort({ createdAt: -1 })
        .select('recipientPhone recipientName status waMessageId sentAt deliveredAt readAt failedAt errorMessage')
        .lean(),
    ]);

    res.json({
      campaignId,
      stats,
      messages,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
