import api from '../config/api';

export const getInboxConversations = async () => api.get('/whatsapp/inbox');
export const getInboxChat = async (phone) => api.get(`/whatsapp/inbox/${phone}`);
export const sendInboxReply = async (phone, content, senderName) => api.post('/whatsapp/inbox/reply', { phone, content, senderName });
