import { io } from 'socket.io-client';
import { ACCOUNT_ID } from './api';

const URL =
  window.location.port === '3001'
    ? `${window.location.protocol}//${window.location.hostname}:4001`
    : window.location.origin;

export const socket = io(URL, {
  query: { accountId: ACCOUNT_ID },
  transports: ['websocket', 'polling'],
});

socket.on('connect', () => console.log('[mail-socket] connected', socket.id));
socket.on('disconnect', (r) => console.log('[mail-socket] disconnected', r));
