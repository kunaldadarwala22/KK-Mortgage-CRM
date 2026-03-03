const API_URL = process.env.REACT_APP_BACKEND_URL;

const getHeaders = () => {
  const headers = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || 'Request failed');
  }
  return response.json();
};

// Auth API
export const authAPI = {
  login: (email, password) =>
    fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    }).then(handleResponse),

  register: (data) =>
    fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    }).then(handleResponse),

  me: () =>
    fetch(`${API_URL}/api/auth/me`, {
      credentials: 'include',
      headers: getHeaders(),
    }).then(handleResponse),

  logout: () =>
    fetch(`${API_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    }),
};

// Users API
export const usersAPI = {
  getAll: () =>
    fetch(`${API_URL}/api/users`, {
      credentials: 'include',
      headers: getHeaders(),
    }).then(handleResponse),

  get: (userId) =>
    fetch(`${API_URL}/api/users/${userId}`, {
      credentials: 'include',
      headers: getHeaders(),
    }).then(handleResponse),

  update: (userId, data) =>
    fetch(`${API_URL}/api/users/${userId}`, {
      method: 'PUT',
      credentials: 'include',
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse),
};

// Clients API
export const clientsAPI = {
  getAll: (params = {}) => {
    const searchParams = new URLSearchParams(params);
    return fetch(`${API_URL}/api/clients?${searchParams}`, {
      credentials: 'include',
      headers: getHeaders(),
    }).then(handleResponse);
  },

  get: (clientId) =>
    fetch(`${API_URL}/api/clients/${clientId}`, {
      credentials: 'include',
      headers: getHeaders(),
    }).then(handleResponse),

  create: (data) =>
    fetch(`${API_URL}/api/clients`, {
      method: 'POST',
      credentials: 'include',
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse),

  update: (clientId, data) =>
    fetch(`${API_URL}/api/clients/${clientId}`, {
      method: 'PUT',
      credentials: 'include',
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse),

  delete: (clientId) =>
    fetch(`${API_URL}/api/clients/${clientId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: getHeaders(),
    }).then(handleResponse),
};

// Cases API
export const casesAPI = {
  getAll: (params = {}) => {
    const searchParams = new URLSearchParams(params);
    return fetch(`${API_URL}/api/cases?${searchParams}`, {
      credentials: 'include',
      headers: getHeaders(),
    }).then(handleResponse);
  },

  get: (caseId) =>
    fetch(`${API_URL}/api/cases/${caseId}`, {
      credentials: 'include',
      headers: getHeaders(),
    }).then(handleResponse),

  create: (data) =>
    fetch(`${API_URL}/api/cases`, {
      method: 'POST',
      credentials: 'include',
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse),

  update: (caseId, data) =>
    fetch(`${API_URL}/api/cases/${caseId}`, {
      method: 'PUT',
      credentials: 'include',
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse),

  delete: (caseId) =>
    fetch(`${API_URL}/api/cases/${caseId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: getHeaders(),
    }).then(handleResponse),
};

// Tasks API
export const tasksAPI = {
  getAll: (params = {}) => {
    const searchParams = new URLSearchParams(params);
    return fetch(`${API_URL}/api/tasks?${searchParams}`, {
      credentials: 'include',
      headers: getHeaders(),
    }).then(handleResponse);
  },

  create: (data) =>
    fetch(`${API_URL}/api/tasks`, {
      method: 'POST',
      credentials: 'include',
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse),

  update: (taskId, data) =>
    fetch(`${API_URL}/api/tasks/${taskId}`, {
      method: 'PUT',
      credentials: 'include',
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse),

  delete: (taskId) =>
    fetch(`${API_URL}/api/tasks/${taskId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: getHeaders(),
    }).then(handleResponse),
};

// Documents API
export const documentsAPI = {
  getAll: (params = {}) => {
    const searchParams = new URLSearchParams(params);
    return fetch(`${API_URL}/api/documents?${searchParams}`, {
      credentials: 'include',
      headers: getHeaders(),
    }).then(handleResponse);
  },

  get: (documentId) =>
    fetch(`${API_URL}/api/documents/${documentId}`, {
      credentials: 'include',
      headers: getHeaders(),
    }).then(handleResponse),

  create: (data) =>
    fetch(`${API_URL}/api/documents`, {
      method: 'POST',
      credentials: 'include',
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse),

  delete: (documentId) =>
    fetch(`${API_URL}/api/documents/${documentId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: getHeaders(),
    }).then(handleResponse),
};

// Dashboard API
export const dashboardAPI = {
  getStats: () =>
    fetch(`${API_URL}/api/dashboard/stats`, {
      credentials: 'include',
      headers: getHeaders(),
    }).then(handleResponse),

  getRevenue: (params = {}) => {
    const searchParams = new URLSearchParams(params);
    return fetch(`${API_URL}/api/dashboard/revenue?${searchParams}`, {
      credentials: 'include',
      headers: getHeaders(),
    }).then(handleResponse);
  },

  getForecast: () =>
    fetch(`${API_URL}/api/dashboard/forecast`, {
      credentials: 'include',
      headers: getHeaders(),
    }).then(handleResponse),

  getRetention: () =>
    fetch(`${API_URL}/api/dashboard/retention`, {
      credentials: 'include',
      headers: getHeaders(),
    }).then(handleResponse),

  getLeadAnalytics: () =>
    fetch(`${API_URL}/api/dashboard/lead-analytics`, {
      credentials: 'include',
      headers: getHeaders(),
    }).then(handleResponse),
};

// Audit Logs API
export const auditAPI = {
  getLogs: (params = {}) => {
    const searchParams = new URLSearchParams(params);
    return fetch(`${API_URL}/api/audit-logs?${searchParams}`, {
      credentials: 'include',
      headers: getHeaders(),
    }).then(handleResponse);
  },
};

export default {
  auth: authAPI,
  users: usersAPI,
  clients: clientsAPI,
  cases: casesAPI,
  tasks: tasksAPI,
  documents: documentsAPI,
  dashboard: dashboardAPI,
  audit: auditAPI,
};
