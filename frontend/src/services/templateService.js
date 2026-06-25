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
