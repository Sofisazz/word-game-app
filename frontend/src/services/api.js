import axios from 'axios';

const API_BASE_URL = 'http://localhost/backend/api';

// Функция для получения токена
const getToken = () => {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
};

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Interceptor для добавления токена к запросам
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('🚀 Making request to:', config.url);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    console.log('✅ Response received:', response.status);
    return response;
  },
  (error) => {
    console.error('❌ API Error:', error);
    if (error.response && error.response.status === 401) {
      // Если 401 - перенаправляем на страницу входа
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: async (credentials) => {
    const response = await api.post('/login.php', credentials);
    // Сохраняем токен если он есть в ответе
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  },
  
  register: async (userData) => {
    const response = await api.post('/register.php', userData);
    return response.data;
  },
  
  logout: async () => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    const response = await api.post('/logout.php');
    return response.data;
  },
  
  checkSession: async () => {
    const response = await api.get('/check_session.php');
    return response.data;
  }
};

export const wordSetsAPI = {
  getAll: () => api.get('/sets.php'),
  getWords: (setId) => api.get(`/words.php?set_id=${setId}`),
};

export const userAPI = {
  saveGameResult: (gameData) => api.post('/game_result.php', gameData),
  getStats: (userId) => api.get(`/user_stats.php?user_id=${userId}`),
  updateProfile: (data) => api.post('/update_profile.php', data),
  uploadAvatar: (formData) => api.post('/upload_avatar.php', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  }),
  getUser: (userId) => api.get(`/get_user.php?user_id=${userId}`),
  getAllAchievements: (userId = null) => {
    const params = userId ? { user_id: userId } : {};
    return api.get('/achievements.php', { params });
  },
  updateActivity: (data) => api.post('/update_activity.php', data)
};

export const adminAPI = {
  getAllUsersWithStats: () => api.get('/admin/users_with_stats.php'),
  getAllUsers: () => api.get('/admin/users.php'),
  
  getStatistics: () => api.get('/admin/statistics.php'),
  
  deleteUser: (userId) => {
    return api.delete(`/admin/delete_user.php?user_id=${userId}`);
  },
  
  exportUserReport: (userId) => api.get(`/admin/export-report.php?user_id=${userId}`),
  getAllWordSets: () => api.get('/admin/word_sets.php'),
  createWordSet: (setData) => api.post('/admin/word_sets.php', setData),
  updateWordSet: (setId, setData) => api.put(`/admin/word_sets.php?set_id=${setId}`, setData),
  deleteWordSet: (setId) => api.delete(`/admin/word_sets.php?set_id=${setId}`),
  getWordsInSet: (setId) => api.get(`/admin/words.php?set_id=${setId}`),
  addWord: (wordData) => api.post('/admin/words.php', wordData),
  updateWord: (wordId, wordData) => api.put(`/admin/words.php?word_id=${wordId}`, wordData),
  deleteWord: (wordId) => api.delete(`/admin/words.php?word_id=${wordId}`),
  getSystemInfo: () => api.get('/admin/system_info.php'),
  createBackup: () => api.get('/admin/backup.php', { responseType: 'blob' }),
  getUserActivity: (days = 7) => api.get(`/admin/user_activity.php?days=${days}`)
};

export const wrongWordsAPI = {
  getUserWrongWords: () => api.get('/wrong_words.php'),
  addWrongWord: (wordId) => api.post('/wrong_words.php', { word_id: wordId }),
  deleteWrongWord: (wrongWordId) => api.delete(`/wrong_words.php/${wrongWordId}`),
  updateWrongWord: (wrongWordId, data) => api.put(`/wrong_words.php/${wrongWordId}`, data),
  clearAllWrongWords: () => api.delete('/wrong_words.php/clear_all'),
  checkWord: (wordId) => api.get(`/wrong_words.php/check/${wordId}`),
  getWrongWordsCount: () => api.get('/wrong_words_count.php')
};

export default api;