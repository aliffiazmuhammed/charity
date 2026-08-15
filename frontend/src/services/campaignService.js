import api from '../config/api';

export const getCampaignHistory = async () => api.get('/campaigns/history');
export const sendCampaign = async (data) => api.post('/campaigns/send', data);
