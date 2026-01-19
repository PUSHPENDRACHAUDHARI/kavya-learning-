const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const BASE = API_BASE ? `${API_BASE}/api` : '/api';

function authHeaders(isForm = false) {
  const token = localStorage.getItem('token');
  const headers = {};

  if (token) headers.Authorization = `Bearer ${token}`;
  if (!isForm) headers['Content-Type'] = 'application/json';

  return headers;
}

/**
 * Create a new announcement
 * @param {Object} announcementData - {title, message, targetRole}
 */
export async function createAnnouncement(announcementData) {
  try {
    const res = await fetch(`${BASE}/admin/announcements`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(announcementData),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = (body && body.message) || `Request failed with status ${res.status}`;
      const err = new Error(msg);
      err.status = res.status;
      err.body = body;
      throw err;
    }
    return body;
  } catch (error) {
    console.error('Error creating announcement:', error);
    throw error;
  }
}

/**
 * Upload a single file (image/video/other) to the backend upload endpoint.
 * Returns parsed JSON { url, public_id, original_filename }
 */
export async function uploadFile(file) {
  try {
    const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
    const BASE = API_BASE ? `${API_BASE}/api` : '/api';
    const form = new FormData();
    form.append('file', file);

    const token = localStorage.getItem('token');
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${BASE}/uploads`, {
      method: 'POST',
      headers,
      body: form
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = (body && body.message) || `Upload failed with status ${res.status}`;
      const err = new Error(msg);
      err.status = res.status;
      err.body = body;
      throw err;
    }
    return body;
  } catch (error) {
    console.error('Upload error', error);
    throw error;
  }
}

/**
 * Get all announcements
 */
export async function listAnnouncements() {
  try {
    const res = await fetch(`${BASE}/admin/announcements`, { headers: authHeaders() });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = (body && body.message) || `Request failed with status ${res.status}`;
      const err = new Error(msg);
      err.status = res.status;
      err.body = body;
      throw err;
    }
    return body;
  } catch (error) {
    console.error('Error fetching announcements:', error);
    throw error;
  }
}

/**
 * Get public announcements for non-admin users (students/parents/instructors)
 */
export async function listPublicAnnouncements() {
  try {
    const res = await fetch(`${BASE}/announcements`, { headers: authHeaders() });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = (body && body.message) || `Request failed with status ${res.status}`;
      const err = new Error(msg);
      err.status = res.status;
      err.body = body;
      throw err;
    }
    return body;
  } catch (error) {
    console.error('Error fetching public announcements:', error);
    throw error;
  }
}

/**
 * Delete an announcement by ID
 * @param {string} announcementId
 */
export async function deleteAnnouncement(announcementId) {
  try {
    const res = await fetch(`${BASE}/admin/announcements/${announcementId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return res.json();
  } catch (error) {
    console.error('Error deleting announcement:', error);
    throw error;
  }
}

/**
 * Get public announcements (for students/public users)
 */
export async function getPublicAnnouncements() {
  try {
    const res = await fetch(`${BASE}/announcements`, { headers: authHeaders() });
    return res.json();
  } catch (error) {
    console.error('Error fetching public announcements:', error);
    throw error;
  }
}
