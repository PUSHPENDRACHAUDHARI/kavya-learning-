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

export async function getMyEvents() {
  const res = await fetch(`${BASE}/events/my-events`, { headers: authHeaders() });
  return res.json();
}

// Convenience: get events for a specific date (client-side filter)
export async function getEventsByDate(dateStr) {
  try {
    const all = await getEvents();
    if (!Array.isArray(all)) return [];
    // Normalize incoming dateStr (YYYY-MM-DD) using local components to avoid UTC shifts
    const formatLocalYYYYMMDD = (d) => {
      try {
        if (!d) return null;
        const dt = (d instanceof Date) ? d : (typeof d === 'string' && d.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) ? new Date(d) : new Date(d);
        if (isNaN(dt)) return null;
        return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
      } catch (e) { return null; }
    };
    const target = formatLocalYYYYMMDD(dateStr) || (dateStr || '').split('T')[0];
    return all.filter(e => {
      try {
        if (!e || !e.date) return false;
        const d = formatLocalYYYYMMDD(e.date);
        return d === target;
      } catch (err) {
        return false;
      }
    });
  } catch (err) {
    return [];
  }
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

// ===== Attendance =====
export async function joinAttendance(eventId) {
  const res = await fetch(`${BASE}/attendance/join`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ eventId }) });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = (body && (body.message || body.error || body.msg)) || 'Failed to join event';
    const err = new Error(msg);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

export async function getAttendanceForEvent(eventId) {
  const res = await fetch(`${BASE}/attendance/event/${eventId}`, { headers: authHeaders() });
  return res.json();
}

export async function getAttendanceForStudent(studentId) {
  const res = await fetch(`${BASE}/attendance/student/${studentId}`, { headers: authHeaders() });
  return res.json();
}

export async function accessAttendance(eventId) {
  const res = await fetch(`${BASE}/attendance/access`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ eventId }) });
  return res.json();
}

export async function leaveAttendance(eventId) {
  const res = await fetch(`${BASE}/attendance/${eventId}/leave`, { method: 'POST', headers: authHeaders() });
  return res.json();
}

export async function leaveAttendanceBeacon(eventId) {
  try {
    const token = localStorage.getItem('token');
    const url = `${BASE}/attendance/${eventId}/leave-beacon${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    // sendBeacon returns boolean; we don't wait for response
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([JSON.stringify({ timestamp: new Date().toISOString() })], { type: 'application/json' });
      navigator.sendBeacon(url, blob);
      return { success: true, beacon: true };
    }
  } catch (e) {
    // fall through to fetch
  }
  // Fallback to fetch when beacon unavailable
  try {
    const res = await fetch(`${BASE}/attendance/${eventId}/leave-beacon`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: localStorage.getItem('token') }) });
    return res.json();
  } catch (e) {
    return { success: false };
  }
}

// Lightweight helper to get a list of instructors. The backend may not expose
// a public instructors list; return empty array when unavailable.
export async function getInstructors() {
  try {
    // Try admin endpoint first (for admin panel)
    const adminRes = await fetch(`${BASE}/admin/instructors`, { headers: authHeaders() });
    if (adminRes.ok) {
      const adminData = await adminRes.json();
      // Handle both array and object with data property
      return Array.isArray(adminData) ? adminData : (adminData.data || []);
    }
  } catch (err) {
    // ignore and fall through
  }
  
  try {
    // Try common endpoint if available
    const res = await fetch(`${BASE}/users?role=instructor`, { headers: authHeaders() });
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? data : (data.data || []);
    }
  } catch (err) {
    // ignore and fall through
  }

  // Fallback: try instructor route (may require auth/role)
  try {
    const res2 = await fetch(`${BASE}/instructor/students`, { headers: authHeaders() });
    if (res2.ok) {
      const data = await res2.json();
      return Array.isArray(data) ? data : (data.data || []);
    }
  } catch (err) {
    // ignore
  }
  return [];
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
  getEventsByDate,
  createEvent,
  getMyEvents,
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
  ,getInstructors
  ,joinAttendance
  ,getAttendanceForEvent
  ,getAttendanceForStudent
   ,leaveAttendance
   ,leaveAttendanceBeacon
};
