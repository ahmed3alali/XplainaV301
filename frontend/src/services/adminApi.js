/**
 * Admin API service layer.
 * All requests attach the admin JWT from localStorage.
 * Never uses the user session token.
 */
import axios from 'axios';
import { getApiBase } from '@/lib/env';

function apiBase() {
  return getApiBase();
}

function getAdminToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('adminToken');
}

function adminHeaders() {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export const adminAuth = {
  async login(email, password) {
    const res = await axios.post(`${apiBase()}/admin/login`, { email, password });
    return res.data; // { access_token, admin_id, email, full_name, role }
  },

  async register(invite_token, email, password, full_name) {
    const res = await axios.post(`${apiBase()}/admin/register`, {
      invite_token, email, password, full_name,
    });
    return res.data;
  },
};

// ── Stats ─────────────────────────────────────────────────────────────────────

export const adminStats = {
  async get() {
    const res = await axios.get(`${apiBase()}/admin/stats`, { headers: adminHeaders() });
    return res.data;
  },
};

// ── Users ─────────────────────────────────────────────────────────────────────

export const adminUsers = {
  async list({ page = 1, page_size = 50, search = '', has_courses = null } = {}) {
    const params = { page, page_size };
    if (search) params.search = search;
    if (has_courses !== null) params.has_courses = has_courses;
    const res = await axios.get(`${apiBase()}/admin/users`, {
      params,
      headers: adminHeaders(),
    });
    return res.data; // { data, total, page, page_size, total_pages }
  },

  async get(userId) {
    const res = await axios.get(`${apiBase()}/admin/users/${userId}`, {
      headers: adminHeaders(),
    });
    return res.data;
  },

  async update(userId, payload) {
    const res = await axios.patch(`${apiBase()}/admin/users/${userId}`, payload, {
      headers: adminHeaders(),
    });
    return res.data;
  },

  async delete(userId) {
    await axios.delete(`${apiBase()}/admin/users/${userId}`, {
      headers: adminHeaders(),
    });
  },

  exportCsvUrl() {
    const token = getAdminToken();
    return `${apiBase()}/admin/users/export?token=${token}`;
  },

  async exportCsv() {
    const res = await axios.get(`${apiBase()}/admin/users/export`, {
      headers: adminHeaders(),
      responseType: 'blob',
    });
    return res.data;
  },

  async changePassword(userId, newPassword) {
    await axios.patch(`${apiBase()}/admin/users/${userId}/password`, {
      new_password: newPassword,
    }, {
      headers: adminHeaders(),
    });
  },
};


// ── Admins ────────────────────────────────────────────────────────────────────

export const adminAdmins = {
  async list() {
    const res = await axios.get(`${apiBase()}/admin/admins`, { headers: adminHeaders() });
    return res.data;
  },

  async get(adminId) {
    const res = await axios.get(`${apiBase()}/admin/admins/${adminId}`, {
      headers: adminHeaders(),
    });
    return res.data;
  },

  async update(adminId, payload) {
    const res = await axios.patch(`${apiBase()}/admin/admins/${adminId}`, payload, {
      headers: adminHeaders(),
    });
    return res.data;
  },

  async deactivate(adminId) {
    await axios.delete(`${apiBase()}/admin/admins/${adminId}`, {
      headers: adminHeaders(),
    });
  },

  async create(payload) {
    const res = await axios.post(`${apiBase()}/admin/admins`, payload, {
      headers: adminHeaders(),
    });
    return res.data;
  },

  async changePassword(adminId, newPassword) {
    await axios.patch(`${apiBase()}/admin/admins/${adminId}/password`, {
      new_password: newPassword,
    }, {
      headers: adminHeaders(),
    });
  },
};

// ── Invites ───────────────────────────────────────────────────────────────────


export const adminInvites = {
  async list() {
    const res = await axios.get(`${apiBase()}/admin/invites`, { headers: adminHeaders() });
    return res.data;
  },

  async create({ email, role, expires_in_hours }) {
    const res = await axios.post(
      `${apiBase()}/admin/invites`,
      { email, role, expires_in_hours },
      { headers: adminHeaders() },
    );
    return res.data;
  },

  async revoke(inviteId) {
    await axios.delete(`${apiBase()}/admin/invites/${inviteId}`, {
      headers: adminHeaders(),
    });
  },
};
