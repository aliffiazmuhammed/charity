import express from 'express';
import { getMessageStats } from '../services/whatsappService.js';
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
    const { templateName, languageCode, recipients, options, scheduledAt, campaignName } = req.body;

    if (!templateName) {
      return res.status(400).json({ error: 'templateName is required' });
    }
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: 'recipients array is required and must not be empty' });
    }

    const campaignId = `campaign_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const finalCampaignName = campaignName || `Campaign ${new Date().toLocaleString('en-IN')}`;

    const formatPhone = (phone) => {
      let digits = phone.replace(/\D/g, '');
      if (digits.length === 10) digits = `91${digits}`;
      return digits;
    };

    // Build all message log entries as 'queued' (or 'scheduled' if future)
    const isScheduled = scheduledAt && new Date(scheduledAt) > new Date();
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
        status: isScheduled ? 'scheduled' : 'queued',
        scheduledAt: isScheduled ? new Date(scheduledAt) : null,
        campaignId,
        campaignName: finalCampaignName,
        bodyParams,
        languageCode: languageCode || 'en',
      };
    });

    // Insert all at once — instant, no timeout
    await MessageLog.insertMany(logsToInsert);

    const summary = {
      campaignId,
      campaignName: finalCampaignName,
      total: logsToInsert.length,
      status: isScheduled ? 'scheduled' : 'queued',
      message: isScheduled
        ? `${logsToInsert.length} messages scheduled for ${scheduledAt}`
        : `${logsToInsert.length} messages queued for background processing`,
    };

    res.json({ summary });
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
          campaignName: { $first: '$campaignName' },
          templateName: { $first: '$templateName' },
          totalMessages: { $sum: 1 },
          queued: { $sum: { $cond: [{ $eq: ['$status', 'queued'] }, 1, 0] } },
          scheduled: { $sum: { $cond: [{ $eq: ['$status', 'scheduled'] }, 1, 0] } },
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
        .select('recipientPhone recipientName status waMessageId sentAt deliveredAt readAt failedAt errorMessage scheduledAt templateName campaignName createdAt')
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

/**
 * POST /api/campaigns/:campaignId/retry
 * Retry failed messages in a campaign.
 */
router.post('/:campaignId/retry', async (req, res) => {
  try {
    const { campaignId } = req.params;

    const result = await MessageLog.updateMany(
      { campaignId, status: 'failed' },
      { 
        $set: { 
          status: 'queued', 
          errorMessage: null, 
          errorCode: null,
          failedAt: null
        },
        $inc: { retryCount: 1 }
      }
    );

    res.json({
      success: true,
      requeuedCount: result.modifiedCount,
      message: `${result.modifiedCount} failed messages requeued for sending.`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
