import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE || '';

const STORAGE_KEY = 'fbnf:userId';
const listeners = new Set();

export function getCurrentUserId() {
  return localStorage.getItem(STORAGE_KEY) || 'demo-user';
}

export function setCurrentUserId(id) {
  localStorage.setItem(STORAGE_KEY, id);
  listeners.forEach(fn => fn(id));
}

export function onUserChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Back-compat constant (snapshot at load). Prefer getCurrentUserId() for live reads.
export const USER_ID = getCurrentUserId();

const client = axios.create({ baseURL: API_BASE });
client.interceptors.request.use((config) => {
  config.headers['x-user-id'] = getCurrentUserId();
  return config;
});

export const getFeed = (params) => client.get('/feed', { params }).then(r => r.data);
export const createPost = (content) => client.post('/posts', { content }).then(r => r.data);
export const reactToPost = (id) => client.post(`/posts/${id}/react`, { type: 'like' }).then(r => r.data);
export const unreactToPost = (id) => client.delete(`/posts/${id}/react`).then(r => r.data);
export const getUsers = () => client.get('/users').then(r => r.data);
export const followUser = (id) => client.put(`/users/${id}/follow`).then(r => r.data);
export const unfollowUser = (id) => client.delete(`/users/${id}/follow`).then(r => r.data);
