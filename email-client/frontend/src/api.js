import axios from 'axios';

export const ACCOUNT_ID = 'me';

const client = axios.create({
  baseURL: '',
  headers: { 'x-account-id': ACCOUNT_ID },
});

// Simulated offline: when true, all writes go to localStorage outbox; reads serve cache.
let forcedOffline = JSON.parse(localStorage.getItem('forcedOffline') || 'false');
export const isForcedOffline = () => forcedOffline;
export const setForcedOffline = (v) => {
  forcedOffline = v;
  localStorage.setItem('forcedOffline', JSON.stringify(v));
};
export const isOnline = () => navigator.onLine && !forcedOffline;

export const listMessages = (params) =>
  client.get('/messages', { params }).then((r) => r.data);

export const getMessage = (id) => client.get(`/messages/${id}`).then((r) => r.data);

export const patchMessage = (id, patch) =>
  client.patch(`/messages/${id}`, patch).then((r) => r.data);

export const deleteMessage = (id) =>
  client.delete(`/messages/${id}`).then((r) => r.data);

export const sendMessage = (msg) =>
  client.post('/messages/send', msg).then((r) => r.data);

export const syncInbox = (priority) =>
  client.post('/messages/sync', null, { params: priority ? { priority } : {} }).then((r) => r.data);
