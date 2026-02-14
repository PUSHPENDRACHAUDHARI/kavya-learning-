// Simple API helper for fetch with safe JSON parsing and automatic auth
const API_PREFIX = '/api';

const parseJsonSafe = async (res) => {
  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();
  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(text);
    } catch (e) {
      throw new Error('Invalid JSON received from server');
    }
  }
  const preview = text.slice(0, 200);
  throw new Error(`Expected JSON but received: ${preview}`);
};

const getBaseHeaders = (headers = {}) => {
  const h = { 'Content-Type': 'application/json', ...headers };
  const token = localStorage.getItem('token');
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
};

const buildUrl = (path) => {
  if (!path) return API_PREFIX;
  if (path.startsWith('/api')) return path;
  if (path.startsWith('/')) return API_PREFIX + path;
  return API_PREFIX + '/' + path;
};

const checkStatusAndParse = async (res) => {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Request failed ${res.status}: ${text.slice(0,150)}`);
  }
  return parseJsonSafe(res);
};

const api = {
  get: async (path, opts = {}) => {
    const url = buildUrl(path);
    const res = await fetch(url, { method: 'GET', headers: getBaseHeaders(opts.headers) });
    return checkStatusAndParse(res);
  },
  post: async (path, body, opts = {}) => {
    const url = buildUrl(path);
    const res = await fetch(url, { method: 'POST', headers: getBaseHeaders(opts.headers), body: JSON.stringify(body) });
    return checkStatusAndParse(res);
  },
  put: async (path, body, opts = {}) => {
    const url = buildUrl(path);
    const res = await fetch(url, { method: 'PUT', headers: getBaseHeaders(opts.headers), body: JSON.stringify(body) });
    return checkStatusAndParse(res);
  },
  del: async (path, opts = {}) => {
    const url = buildUrl(path);
    const res = await fetch(url, { method: 'DELETE', headers: getBaseHeaders(opts.headers) });
    return checkStatusAndParse(res);
  }
};

export default api;
