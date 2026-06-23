import api from '../config/api';

export const login = async (username, password) => {
  const response = await api.post('/auth/login', { username, password });
  const { accessToken, refreshToken, admin } = response.data;
  
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
  
  return admin;
};

export const logout = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
};

export const validateToken = async () => {
  try {
    const response = await api.get('/auth/validate');
    return response.data.valid;
  } catch (error) {
    return false;
  }
};
