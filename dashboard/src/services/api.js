import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

export const healthCheck = async () => {
  const response = await api.get('/health');
  return response.data;
};

export default api;
