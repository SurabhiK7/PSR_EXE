import api from '../api/client.js';

const STORAGE_KEY = 'pcp_current_user';

export async function login(email, password) {
  const res = await api.post('/auth/login', { email, password });
  setCurrentUser(res.data.user);
  return res.data.user;
}

export async function signup(name, email, password) {
  const res = await api.post('/auth/signup', { name, email, password });
  setCurrentUser(res.data.user);
  return res.data.user;
}

export function setCurrentUser(user) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function logout() {
  localStorage.removeItem(STORAGE_KEY);
}
