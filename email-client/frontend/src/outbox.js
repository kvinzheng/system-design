// Offline outbox: queue compose actions in localStorage, drain on reconnect.
import { sendMessage, isOnline } from './api';

const KEY = 'email:outbox';

export function getOutbox() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
  catch { return []; }
}

function setOutbox(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent('outbox:changed'));
}

export function queueMessage(msg) {
  const item = { ...msg, clientId: crypto.randomUUID(), queuedAt: new Date().toISOString() };
  const list = getOutbox();
  list.push(item);
  setOutbox(list);
  return item;
}

let flushing = false;
export async function flushOutbox() {
  if (flushing) return;
  flushing = true;
  try {
    const list = getOutbox();
    const remaining = [];
    for (const item of list) {
      if (!isOnline()) { remaining.push(item); continue; }
      try {
        await sendMessage({ to: item.to, subject: item.subject, body: item.body });
      } catch (e) {
        remaining.push(item); // keep on failure
      }
    }
    setOutbox(remaining);
  } finally {
    flushing = false;
  }
}

// Auto-flush triggers
window.addEventListener('online', flushOutbox);
window.addEventListener('outbox:flush', flushOutbox);
