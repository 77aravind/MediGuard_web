import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('mediguard_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('mediguard_token');
      localStorage.removeItem('mediguard_user');
      window.location.href = '/auth';
    }
    return Promise.reject(error);
  }
);

export const login = async (data: any) => {
  const response = await api.post('/auth/login', data);
  if (response.data.token) {
    localStorage.setItem('mediguard_token', response.data.token);
    localStorage.setItem('mediguard_user', JSON.stringify(response.data.user));
  }
  return response.data;
};

export const signup = async (data: any) => {
  const response = await api.post('/auth/signup', data);
  if (response.data.token) {
    localStorage.setItem('mediguard_token', response.data.token);
    localStorage.setItem('mediguard_user', JSON.stringify(response.data.user));
  }
  return response.data;
};

export const logout = () => {
  localStorage.removeItem('mediguard_token');
  localStorage.removeItem('mediguard_user');
};

export const getHealth = async () => {
  const response = await api.get('/health');
  return response.data;
};

export const getPrescriptions = async () => {
  const response = await api.get('/prescriptions');
  return response.data;
};

export const togglePrescriptionStatus = async (id: string) => {
  const response = await api.patch(`/prescriptions/${id}/toggle`);
  return response.data;
};

export const deletePrescription = async (id: string) => {
  await api.delete(`/prescriptions/${id}`);
};

export const updatePrescription = async (id: string, data: any) => {
  const response = await api.patch(`/prescriptions/${id}`, data);
  return response.data;
};

export const savePrescription = async (data: any) => {
  const response = await api.post('/prescriptions', data);
  return response.data;
};

export const getSafetyChecks = async () => {
  const response = await api.get('/safety-checks');
  return response.data;
};

export const saveSafetyCheck = async (data: any) => {
  const response = await api.post('/safety-checks', data);
  return response.data;
};

export const deleteSafetyCheck = async (id: string) => {
  await api.delete(`/safety-checks/${id}`);
};

export const getProfile = async () => {
  const response = await api.get('/profile');
  return response.data;
};

export const updateProfile = async (data: any) => {
  const response = await api.patch('/profile', data);
  return response.data;
};

export default api;
