import axios from 'axios';

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 20000,
});

// Attach token if available
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global response interceptor to handle blocked users
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const message = error?.response?.data?.message || '';
    if (status === 403 && /blocked/i.test(message)) {
      // Clear token and redirect to blocked page
      try {
        localStorage.removeItem('token');
        window.location = '/blocked';
      } catch (err) {
        console.error('Error handling blocked redirect', err);
      }
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
