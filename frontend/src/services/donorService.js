import api from '../config/api';

export const getAllDonors = async (params = {}) => {
  const response = await api.get('/donors', { params });
  return response.data;
};

export const getDonorProfile = async (phone) => {
  const response = await api.get(`/donors/${phone}`);
  return response.data;
};
