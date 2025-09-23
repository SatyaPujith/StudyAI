import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (userData: any) => api.post('/auth/register', userData),
  login: (credentials: any) => api.post('/auth/login', credentials),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data: any) => api.put('/auth/profile', data),
};

// Study API
export const studyAPI = {
  // Study Plans
  createStudyPlan: (data: any) => api.post('/study/plans', data),
  getStudyPlans: () => api.get('/study/plans'),
  updateStudyPlan: (id: string, data: any) => api.put(`/study/plans/${id}`, data),
  
  // Quizzes
  createQuiz: (data: any) => api.post('/study/quizzes', data),
  createManualQuiz: (data: any) => api.post('/study/quizzes/manual', data),
  getQuizzes: (params?: any) => api.get('/study/quizzes', { params }),
  joinQuizByCode: (data: any) => api.post('/study/quizzes/join', data),
  submitQuizAttempt: (data: any) => api.post('/study/quiz-attempts', data),
  getQuizAttempts: () => api.get('/study/quiz-attempts'),
  
  // AI Features
  explainConcept: (data: any) => api.post('/study/explain-concept', data),
  generateFlashcards: (data: any) => api.post('/study/generate-flashcards', data),
  
  // Study Groups
  createStudyGroup: (data: any) => api.post('/study-groups', data),
  getStudyGroups: (params?: any) => api.get('/study-groups', { params }),
  joinStudyGroup: (id: string) => api.post(`/study-groups/${id}/join`),
  leaveStudyGroup: (id: string) => api.post(`/study-groups/${id}/leave`),
};

// AI API
export const aiAPI = {
  chat: (data: any) => api.post('/ai/chat', data),
  getConversations: () => api.get('/ai/conversations'),
  getConversation: (id: string) => api.get(`/ai/conversations/${id}`),
  deleteConversation: (id: string) => api.delete(`/ai/conversations/${id}`),
  
  // Agents
  createAgent: (data: any) => api.post('/ai/agents', data),
  getAgents: () => api.get('/ai/agents'),
  updateAgent: (id: string, data: any) => api.put(`/ai/agents/${id}`, data),
  
  healthCheck: () => api.get('/ai/health'),
};

// Upload API
export const uploadAPI = {
  uploadSyllabus: (formData: FormData) => api.post('/upload/syllabus', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
};

export default api;