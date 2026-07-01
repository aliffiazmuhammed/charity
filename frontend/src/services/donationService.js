import api from '../config/api';

export const checkBackendStatus = async () => {
  const response = await api.get('/status');
  return response.data;
};

export const getDashboardStats = async () => {
  const response = await api.get('/donations/stats');
  return response.data;
};

export const getDonations = async (params = {}) => {
  const response = await api.get(`/donations`, { params });
  return response.data;
};

export const submitDonation = async (donationData) => {
  const response = await api.post('/donations', donationData);
  return response.data;
};

export const deleteDonation = async (id) => {
  const response = await api.delete(`/donations/${id}`);
  return response.data;
};

// Donor Specific Services
export const getAllDonors = async (params = {}) => {
  const response = await api.get('/donors', { params });
  return response.data;
};

export const getDonorProfile = async (phone) => {
  const response = await api.get(`/donors/${phone}`);
  return response.data;
};

export const checkReturningDonor = async (phone) => {
  const response = await api.get(`/donors/check/${phone}`);
  return response.data;
};

// CSV Export (trigger download)
export const exportDonationsCSV = () => {
  // Can just be a direct link since the backend might expect authorization,
  // we can use axios to fetch Blob and then download it to include headers.
  return api.get('/donations/export', { responseType: 'blob' })
    .then((response) => {
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'donations-export.csv');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    });
};

export const getCareOfStats = async () => {
  const response = await api.get('/donations/care-of-stats');
  return response.data;
};
