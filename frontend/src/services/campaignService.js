import api from '../config/api';

export const getCampaignHistory = async () => api.get('/campaigns/history');
export const sendCampaign = async (data) => api.post('/campaigns/send', data);
export const getCampaignStatus = async (campaignId) => api.get(`/campaigns/${campaignId}/status`);
export const retryFailedCampaignMessages = async (campaignId) => api.post(`/campaigns/${campaignId}/retry`);
export const stopCampaign = async (campaignId) => api.post(`/campaigns/${campaignId}/stop`);
export const deleteCampaign = async (campaignId) => api.delete(`/campaigns/${campaignId}`);
