import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.LDS_DB_PATH || path.join(__dirname, '..', 'data.sqlite');

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS distribution_centers (
      id          INTEGER PRIMARY KEY,
      name        TEXT NOT NULL,
      lat         REAL NOT NULL,
      lng         REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS items (
      id          INTEGER PRIMARY KEY,
      name        TEXT NOT NULL,
      description TEXT,
      price_cents INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS inventory (
      dc_id    INTEGER NOT NULL REFERENCES distribution_centers(id),
      item_id  INTEGER NOT NULL REFERENCES items(id),
      quantity INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (dc_id, item_id)
    );

    CREATE INDEX IF NOT EXISTS idx_inventory_item ON inventory(item_id);

    CREATE TABLE IF NOT EXISTS orders (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      lat        REAL NOT NULL,
      lng        REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      status     TEXT NOT NULL DEFAULT 'placed'
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id  INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      dc_id     INTEGER NOT NULL REFERENCES distribution_centers(id),
      item_id   INTEGER NOT NULL REFERENCES items(id),
      quantity  INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS idempotency_keys (
      key             TEXT PRIMARY KEY,
      request_hash    TEXT NOT NULL,
      status_code     INTEGER NOT NULL,
      response_body   TEXT NOT NULL,
      created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}
