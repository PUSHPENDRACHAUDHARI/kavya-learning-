const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const BASE = API_BASE ? `${API_BASE}/api` : '/api';

function authHeaders(isForm = false) {
  const token = localStorage.getItem('token');
  const headers = {};

  if (token) headers.Authorization = `Bearer ${token}`;
  // Don't set Content-Type for FormData — browser will add the correct boundary
  if (!isForm) headers['Content-Type'] = 'application/json';

  return headers;
}

export async function getCourses() {
  const res = await fetch(`${BASE}/courses`, { headers: authHeaders() });
  return res.json();
}

export async function createCourse(payload) {
  const res = await fetch(`${BASE}/courses`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(payload) });
  return res.json();
}

export async function getQuizzes(courseId) {
  const url = courseId ? `${BASE}/quiz?courseId=${courseId}` : `${BASE}/quiz`;
  const res = await fetch(url, { headers: authHeaders() });
  return res.json();
}

export async function createQuiz(payload) {
  const res = await fetch(`${BASE}/quiz`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(payload) });
  return res.json();
}

export async function getQuiz(id) {
  const res = await fetch(`${BASE}/quiz/${id}`, { headers: authHeaders() });
  return res.json();
}

export async function submitQuiz(id, answers) {
  const res = await fetch(`${BASE}/quiz/${id}/submit`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ answers }) });
  return res.json();
}

export async function getEvents() {
  const res = await fetch(`${BASE}/events`, { headers: authHeaders() });
  return res.json();
}

export async function createEvent(payload) {
  const res = await fetch(`${BASE}/events`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(payload) });
  return res.json();
}

// ===== Dashboard Feed =====
export async function getDashboardFeed() {
  const res = await fetch(`${BASE}/student/dashboard-feed`, { headers: authHeaders() });
  return res.json();
}

export async function getProfile() {
  const res = await fetch(`${BASE}/users/profile`, { headers: authHeaders() });
  return res.json();
}

export async function updateProfile(payload) {
  const res = await fetch(`${BASE}/users/profile`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to update profile');
  }

  return res.json();
}

/// =================== PHOTO UPLOAD ===================
export async function uploadProfilePhoto(file) {
  const formData = new FormData();
  formData.append('profilePhoto', file);

  const res = await fetch(`${BASE}/users/upload-photo`, {
    method: 'POST',
    headers: authHeaders(true),  // 🟢 FIXED — no JSON header
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Failed to upload photo');
  }

  return res.json();
}

export async function deleteProfilePhoto() {
  const res = await fetch(`${BASE}/users/photo`, {
    method: 'DELETE',
    headers: authHeaders(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to delete profile photo');
  }

  return res.json();
}

// Get user streak
export async function getStreak() {
  const res = await fetch(`${BASE}/users/streak`, { headers: authHeaders() });
  if (!res.ok) {
    throw new Error('Failed to load streak');
  }
  return res.json();
}

// ===== Progress / Profile analytics =====

export async function getProgressOverview() {
  const res = await fetch(`${BASE}/progress/overview`, { headers: authHeaders() });
  if (!res.ok) {
    throw new Error('Failed to load progress overview');
  }
  return res.json();
}

export async function getRecentActivity() {
  const res = await fetch(`${BASE}/progress/activity`, { headers: authHeaders() });
  if (!res.ok) {
    throw new Error('Failed to load recent activity');
  }
  return res.json();
}

export async function downloadCertificate(courseId) {
  const res = await fetch(`${BASE}/progress/certificates/${courseId}/download`, {
    method: 'GET',
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error('Certificate is not available yet');
  }

  return res.blob();
}

export async function aiQuery(courseId, query) {
  const res = await fetch(`${BASE}/ai/query`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ courseId, query }) });
  return res.json();
}

// ===== Notifications =====

export async function getNotifications(limit = 20, page = 1) {
  const res = await fetch(`${BASE}/notifications?limit=${limit}&page=${page}`, { headers: authHeaders() });
  return res.json();
}

// ===== Search =====
export async function search(query) {
  const qRaw = (query || '').trim();
  if (!qRaw) return { success: false, query: qRaw, results: [] };

  // Count sentences to decide whether to use POST for long-form searches
  const sentences = (qRaw.match(/[^.!?\n]+[.!?\n]*/g) || []).map(s => s.trim()).filter(Boolean);
  const usePost = qRaw.length > 500 || qRaw.includes('\n') || sentences.length > 1;

  if (usePost) {
    // Use POST to handle large payloads and long-form queries
    const res = await fetch(`${BASE}/search`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ q: qRaw }) });
    return res.json();
  }

  // Short single-line query — use GET
  const q = encodeURIComponent(qRaw);
  const res = await fetch(`${BASE}/search?q=${q}`, { headers: authHeaders() });
  return res.json();
}

// ===== Course-specific Search =====
export async function searchCourses(query) {
  const qRaw = (query || '').trim();
  if (!qRaw) return { success: false, query: qRaw, results: [], message: 'Course Not Available' };

  // Count sentences to decide whether to use POST for long-form searches
  const sentences = (qRaw.match(/[^.!?\n]+[.!?\n]*/g) || []).map(s => s.trim()).filter(Boolean);
  const usePost = qRaw.length > 500 || qRaw.includes('\n') || sentences.length > 1;

  if (usePost) {
    // Use POST to handle large payloads and long-form queries
    const res = await fetch(`${BASE}/search/courses`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ q: qRaw }) });
    return res.json();
  }

  // Short single-line query — use GET
  const q = encodeURIComponent(qRaw);
  const res = await fetch(`${BASE}/search/courses?q=${q}`, { headers: authHeaders() });
  return res.json();
}

export async function getUnreadNotificationCount() {
  const res = await fetch(`${BASE}/notifications/count/unread`, { headers: authHeaders() });
  return res.json();
}

export async function markNotificationAsRead(notificationId) {
  const res = await fetch(`${BASE}/notifications/${notificationId}/read`, { method: 'PATCH', headers: authHeaders() });
  return res.json();
}

export async function markAllNotificationsAsRead() {
  const res = await fetch(`${BASE}/notifications/read/all`, { method: 'PATCH', headers: authHeaders() });
  return res.json();
}

export async function deleteNotification(notificationId) {
  const res = await fetch(`${BASE}/notifications/${notificationId}`, { method: 'DELETE', headers: authHeaders() });
  return res.json();
}

export async function deleteAllNotifications() {
  const res = await fetch(`${BASE}/notifications/all`, { method: 'DELETE', headers: authHeaders() });
  return res.json();
}

// ===== Schedule / Upcoming Classes =====
export async function getUpcomingClasses(limit = 20, page = 1) {
  const res = await fetch(`${BASE}/schedule/upcoming?limit=${limit}&page=${page}`, { headers: authHeaders() });
  return res.json();
}

// ===== Student dashboard feed (live, upcoming, notifications, announcements) =====


export default {
  getCourses,
  createCourse,
  getQuizzes,
  createQuiz,
  getQuiz,
  submitQuiz,
  getEvents,
  createEvent,
  getProfile,
  getProgressOverview,
  getRecentActivity,
  downloadCertificate,
  aiQuery,
  uploadProfilePhoto,
  deleteProfilePhoto,
  updateProfile,
  getStreak
  ,getUpcomingClasses
  ,getDashboardFeed
};
