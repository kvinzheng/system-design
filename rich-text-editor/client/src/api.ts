export interface DocumentSummary {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface DocumentRecord extends DocumentSummary {
  /** HTML string (serialized editor content). */
  content: string;
}

const BASE = '/api/documents';

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

export const api = {
  list: () => fetch(BASE).then((r) => json<DocumentSummary[]>(r)),
  get: (id: string) => fetch(`${BASE}/${id}`).then((r) => json<DocumentRecord>(r)),
  create: (title: string, content: string) =>
    fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content }),
    }).then((r) => json<DocumentRecord>(r)),
  update: (id: string, patch: { title?: string; content?: string }) =>
    fetch(`${BASE}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }).then((r) => json<DocumentRecord>(r)),
  remove: (id: string) =>
    fetch(`${BASE}/${id}`, { method: 'DELETE' }).then((r) => json<void>(r)),
};
