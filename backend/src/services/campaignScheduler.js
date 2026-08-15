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

export const startCampaignScheduler = () => {
  setInterval(async () => {
    try {
      const messages = await MessageLog.find({
        status: 'scheduled',
        scheduledAt: { $lte: new Date() }
      });

      for (const log of messages) {
        log.status = 'queued';
        await log.save();

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
          console.log(`[Scheduler] ✅ Scheduled message sent to ${formattedPhone} (wamid: ${log.waMessageId})`);
        } catch (error) {
          const errData = error.response?.data?.error || {};
          log.status = 'failed';
          log.failedAt = new Date();
          log.errorCode = String(errData.code || error.response?.status || 'UNKNOWN');
          log.errorMessage = errData.message || error.message;
          await log.save();
          console.error(`[Scheduler] ❌ Failed to send scheduled message to ${formattedPhone}:`, log.errorMessage);
        }
      }
    } catch (error) {
      console.error('[Scheduler] Error processing scheduled messages:', error.message);
    }
  }, 60000);
};
