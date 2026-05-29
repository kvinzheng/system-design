const API = ''; // vite proxies /api -> server

export async function listDocuments() {
  const res = await fetch(`${API}/api/documents`);
  if (!res.ok) throw new Error('Failed to list documents');
  return res.json();
}

export async function createDocument(title) {
  const res = await fetch(`${API}/api/documents`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title })
  });
  if (!res.ok) throw new Error('Failed to create document');
  return res.json();
}

export async function getDocument(id) {
  const res = await fetch(`${API}/api/documents/${id}`);
  if (!res.ok) throw new Error('Failed to load document');
  return res.json();
}

export async function renameDocument(id, title) {
  const res = await fetch(`${API}/api/documents/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title })
  });
  if (!res.ok) throw new Error('Failed to rename');
  return res.json();
}
