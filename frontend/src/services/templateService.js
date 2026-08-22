import api from '../config/api';

export const getTemplates = async () => {
  const response = await api.get('/templates');
  return response.data;
};

export const createTemplate = async (templateData) => {
  const response = await api.post('/templates', templateData);
  return response.data;
};

export const updateTemplate = async (id, templateData) => {
  const response = await api.put(`/templates/${id}`, templateData);
  return response.data;
};

export const activateTemplate = async (id) => {
  const response = await api.patch(`/templates/${id}/activate`);
  return response.data;
};

export const deleteTemplate = async (id) => {
  const response = await api.delete(`/templates/${id}`);
  return response.data;
};

export const syncMetaTemplates = async () => {
  const response = await api.post('/templates/sync-meta');
  return response.data;
};

export const submitToMeta = async (id) => {
  const response = await api.post(`/templates/${id}/submit-to-meta`);
  return response.data;
};

export const uploadMedia = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};
