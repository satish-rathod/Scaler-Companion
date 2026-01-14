import axios from 'axios';

const api = axios.create({
  baseURL: '/api', // Proxy handles this to localhost:8000
});

export const healthCheck = async () => {
  const response = await api.get('/health');
  return response.data;
};

export const getRecordings = async () => {
  const response = await api.get('/v1/recordings');
  return response.data;
};

export const deleteRecording = async (id) => {
  const response = await api.delete(`/v1/recordings/${id}`);
  return response.data;
};

export const startProcessing = async (data) => {
  const response = await api.post('/v1/process', data);
  return response.data;
};

export const getProcessStatus = async (id) => {
  const response = await api.get(`/v1/process/${id}`);
  return response.data;
};

export const getArtifact = async (path) => {
  // path usually starts with /content/..., which is handled by proxy
  const response = await axios.get(path);
  return response.data;
};

export const getModels = async () => {
  const response = await api.get('/v1/models');
  return response.data;
};

export const getQueueStatus = async () => {
  const response = await api.get('/v1/queue');
  return response.data;
};

export default api;
