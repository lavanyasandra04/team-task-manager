import api from './axios';

// Auth
export const authApi = {
  signup: (data) => api.post('/auth/signup', data).then((r) => r.data),
  login: (data) => api.post('/auth/login', data).then((r) => r.data),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
  me: () => api.get('/auth/me').then((r) => r.data),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }).then((r) => r.data),
};

// Projects
export const projectsApi = {
  getAll: () => api.get('/projects').then((r) => r.data),
  getOne: (id) => api.get(`/projects/${id}`).then((r) => r.data),
  create: (data) => api.post('/projects', data).then((r) => r.data),
  update: (id, data) => api.put(`/projects/${id}`, data).then((r) => r.data),
  delete: (id) => api.delete(`/projects/${id}`).then((r) => r.data),
  addMember: (id, data) => api.post(`/projects/${id}/members`, data).then((r) => r.data),
  removeMember: (id, userId) => api.delete(`/projects/${id}/members/${userId}`).then((r) => r.data),
  updateMemberRole: (id, userId, role) => api.put(`/projects/${id}/members/${userId}`, { role }).then((r) => r.data),
};

// Tasks
export const tasksApi = {
  getAll: (projectId, params) => api.get(`/projects/${projectId}/tasks`, { params }).then((r) => r.data),
  getOne: (id) => api.get(`/tasks/${id}`).then((r) => r.data),
  create: (projectId, data) => api.post(`/projects/${projectId}/tasks`, data).then((r) => r.data),
  update: (id, data) => api.put(`/tasks/${id}`, data).then((r) => r.data),
  updateStatus: (id, status) => api.put(`/tasks/${id}/status`, { status }).then((r) => r.data),
  delete: (id) => api.delete(`/tasks/${id}`).then((r) => r.data),
};

// Dashboard
export const dashboardApi = {
  myTasks: () => api.get('/dashboard/my-tasks').then((r) => r.data),
  overdue: () => api.get('/dashboard/overdue').then((r) => r.data),
  stats: () => api.get('/dashboard/stats').then((r) => r.data),
};