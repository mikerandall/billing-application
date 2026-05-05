import axios from 'axios';

const API_BASE_URL = 'http://localhost:8822';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Clients API
export const clientsAPI = {
  getAll: () => api.get('/clients/'),
  getById: (id) => api.get(`/clients/${id}`),
  create: (data) => api.post('/clients/', data),
  update: (id, data) => api.put(`/clients/${id}`, data),
  delete: (id) => api.delete(`/clients/${id}`),
};

// Projects API
export const projectsAPI = {
  getAll: (params = {}) => api.get('/projects/', { params }),
  getById: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects/', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  getHoursSummary: (id) => api.get(`/projects/${id}/hours-summary`),
};

// Hours API
export const hoursAPI = {
  getAll: (params = {}) => api.get('/hours/', { params }),
  getById: (id) => api.get(`/hours/${id}`),
  create: (data) => api.post('/hours/', data),
  update: (id, data) => api.put(`/hours/${id}`, data),
  delete: (id) => api.delete(`/hours/${id}`),
  // Test endpoints
  testMarkInvoiced: (projectId) => api.post(`/hours/test/mark-invoiced/${projectId}`),
  testMarkUninvoiced: (projectId) => api.post(`/hours/test/mark-uninvoiced/${projectId}`),
};

// Invoices API
export const invoicesAPI = {
  getAll: (params = {}) => api.get('/invoices/', { params }),
  getById: (id) => api.get(`/invoices/${id}`),
  create: (data) => api.post('/invoices/', data),
  getDownloadUrl: (id) => `${API_BASE_URL}/invoices/${id}/download`,
  regeneratePdf: (id) => api.post(`/invoices/${id}/regenerate-pdf`),
  getConfig: () => api.get('/invoices/config'),
};

export default api;
