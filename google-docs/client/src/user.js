// Pick or persist a per-tab user identity for awareness (cursors / labels).
// Using sessionStorage so each tab is a distinct participant — matches the
// requirement that two tabs of the same user are treated independently.

const NAMES = ['Otter', 'Falcon', 'Panda', 'Koala', 'Lynx', 'Heron', 'Bison', 'Gecko', 'Wren', 'Tapir'];
const COLORS = ['#1e88e5', '#43a047', '#e53935', '#fb8c00', '#8e24aa', '#00897b', '#5e35b1', '#d81b60', '#3949ab', '#6d4c41'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

export function getUser() {
  let raw = sessionStorage.getItem('docs:user');
  if (raw) {
    try { return JSON.parse(raw); } catch (_) {}
  }
  const user = {
    name: `Guest ${pick(NAMES)}`,
    color: pick(COLORS)
  };
  sessionStorage.setItem('docs:user', JSON.stringify(user));
  return user;
}

export function setUserName(name) {
  const user = getUser();
  user.name = name || user.name;
  sessionStorage.setItem('docs:user', JSON.stringify(user));
  return user;
}
