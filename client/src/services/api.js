import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach JWT token if present in localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth Endpoints
export const registerUser = async (userData) => {
  const response = await api.post('/auth/register', userData);
  return response.data;
};

export const loginUser = async (credentials) => {
  const response = await api.post('/auth/login', credentials);
  return response.data;
};

export const getMe = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

// Item Endpoints
export const getItems = async (params = {}) => {
  const response = await api.get('/items', { params });
  return response.data;
};

export const getItemById = async (id) => {
  const response = await api.get(`/items/${id}`);
  return response.data;
};

export const getStats = async () => {
  const response = await api.get('/items/stats');
  return response.data;
};

export const createItem = async (itemData) => {
  const response = await api.post('/items', itemData);
  return response.data;
};

export const updateItemStatus = async (id, status) => {
  const response = await api.patch(`/items/${id}/status`, { status });
  return response.data;
};

export const submitClaim = async (id, claimData) => {
  const response = await api.post(`/items/${id}/claims`, claimData);
  return response.data;
};

export const reviewClaim = async (itemId, claimId, status) => {
  const response = await api.patch(`/items/${itemId}/claims/${claimId}`, { status });
  return response.data;
};

export default api;
