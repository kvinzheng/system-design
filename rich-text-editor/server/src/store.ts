import fs from 'fs';
import path from 'path';

export interface DocumentRecord {
  id: string;
  title: string;
  /** Serialized editor state (JSON tree, see client/src/editor/types.ts). */
  content: unknown;
  createdAt: number;
  updatedAt: number;
}

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'documents.json');

function ensureFile(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', 'utf8');
}

function readAll(): DocumentRecord[] {
  ensureFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw) as DocumentRecord[];
  } catch {
    return [];
  }
}

function writeAll(docs: DocumentRecord[]): void {
  ensureFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(docs, null, 2), 'utf8');
}

export const store = {
  list(): DocumentRecord[] {
    return readAll()
      .map(({ id, title, updatedAt, createdAt }) => ({
        id,
        title,
        updatedAt,
        createdAt,
        content: undefined,
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt) as DocumentRecord[];
  },

  get(id: string): DocumentRecord | undefined {
    return readAll().find((d) => d.id === id);
  },

  create(input: { title: string; content: unknown }): DocumentRecord {
    const docs = readAll();
    const now = Date.now();
    const doc: DocumentRecord = {
      id: cryptoRandomId(),
      title: input.title || 'Untitled',
      content: input.content ?? null,
      createdAt: now,
      updatedAt: now,
    };
    docs.push(doc);
    writeAll(docs);
    return doc;
  },

  update(id: string, patch: Partial<Pick<DocumentRecord, 'title' | 'content'>>): DocumentRecord | undefined {
    const docs = readAll();
    const idx = docs.findIndex((d) => d.id === id);
    if (idx === -1) return undefined;
    const updated: DocumentRecord = {
      ...docs[idx],
      ...patch,
      updatedAt: Date.now(),
    };
    docs[idx] = updated;
    writeAll(docs);
    return updated;
  },

  delete(id: string): boolean {
    const docs = readAll();
    const next = docs.filter((d) => d.id !== id);
    if (next.length === docs.length) return false;
    writeAll(next);
    return true;
  },
};

function cryptoRandomId(): string {
  // Node 16+ has globalThis.crypto with randomUUID in 19+; fallback supported.
  const c = (globalThis as any).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
