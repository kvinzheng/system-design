import { io } from 'socket.io-client';
import { getCurrentUserId, onUserChange } from './api';

const SOCKET_URL =
  process.env.REACT_APP_SOCKET_URL ||
  (window.location.port === '3000'
    ? `${window.location.protocol}//${window.location.hostname}:4000`
    : window.location.origin);

function makeSocket(userId) {
  return io(SOCKET_URL, {
    query: { userId },
    transports: ['websocket', 'polling'],
    autoConnect: true,
    forceNew: true,
  });
}

export let socket = makeSocket(getCurrentUserId());
socket.on('connect', () => console.log('[socket] connected as', getCurrentUserId(), socket.id));

// When the active user changes, swap the socket connection and re-emit handlers via a custom event.
const swapListeners = new Set();
export function onSocketSwap(fn) {
  swapListeners.add(fn);
  return () => swapListeners.delete(fn);
}

onUserChange((newId) => {
  try { socket.disconnect(); } catch {}
  socket = makeSocket(newId);
  socket.on('connect', () => console.log('[socket] reconnected as', newId, socket.id));
  swapListeners.forEach(fn => fn(socket));
});
