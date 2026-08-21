import api from '../config/api';

export const getContacts = async (params = {}) => {
  const response = await api.get('/contacts', { params });
  return response.data;
};

export const getContactTags = async () => {
  const response = await api.get('/contacts/tags');
  return response.data;
};

export const createContact = async (data) => {
  const response = await api.post('/contacts', data);
  return response.data;
};

export const updateContact = async (id, data) => {
  const response = await api.put(`/contacts/${id}`, data);
  return response.data;
};

export const deleteContact = async (id) => {
  const response = await api.delete(`/contacts/${id}`);
  return response.data;
};

export const bulkImportContacts = async (contacts) => {
  const response = await api.post('/contacts/bulk', { contacts });
  return response.data;
};

export const syncDonorsToContacts = async () => {
  const response = await api.post('/contacts/sync-donors');
  return response.data;
};
