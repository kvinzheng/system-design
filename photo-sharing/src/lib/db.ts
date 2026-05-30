import Database, { type Database as DB } from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

let _db: DB | null = null;
function db(): DB {
  if (_db) return _db;
  const DATA_DIR = path.join(process.cwd(), "data");
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(path.join(DATA_DIR, "uploads"), { recursive: true });
  const conn = new Database(path.join(DATA_DIR, "app.db"), { timeout: 5000 });
  conn.pragma("journal_mode = WAL");
  conn.pragma("busy_timeout = 5000");
  conn.exec(SCHEMA);
  _db = conn;
  return conn;
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    author TEXT NOT NULL,
    caption TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS post_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    thumb_url TEXT NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    position INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS likes (
    post_id INTEGER NOT NULL,
    user TEXT NOT NULL,
    PRIMARY KEY (post_id, user)
  );
  CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_images_post ON post_images(post_id, position);
`;

export type PostImage = {
  id: number;
  url: string;
  thumb_url: string;
  width: number;
  height: number;
  position: number;
};

export type Post = {
  id: number;
  author: string;
  caption: string;
  created_at: number;
  images: PostImage[];
  likes: number;
};

export function listFeed(opts: { cursor?: number; limit?: number } = {}): {
  items: Post[];
  nextCursor: number | null;
} {
  const limit = Math.min(opts.limit ?? 10, 50);
  const cursor = opts.cursor ?? Number.MAX_SAFE_INTEGER;
  const conn = db();
  const rows = conn
    .prepare(
      `SELECT id, author, caption, created_at FROM posts
       WHERE created_at < ? ORDER BY created_at DESC LIMIT ?`
    )
    .all(cursor, limit + 1) as Array<Omit<Post, "images" | "likes">>;

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;

  const imgStmt = conn.prepare(
    `SELECT id, post_id, url, thumb_url, width, height, position
     FROM post_images WHERE post_id = ? ORDER BY position ASC`
  );
  const likeStmt = conn.prepare(
    `SELECT COUNT(*) as c FROM likes WHERE post_id = ?`
  );

  const items: Post[] = pageRows.map((r) => ({
    ...r,
    images: imgStmt.all(r.id) as PostImage[],
    likes: (likeStmt.get(r.id) as { c: number }).c,
  }));

  const nextCursor = hasMore ? pageRows[pageRows.length - 1].created_at : null;
  return { items, nextCursor };
}

export function createPost(input: {
  author: string;
  caption: string;
  images: Array<{ url: string; thumb_url: string; width: number; height: number }>;
}): number {
  const conn = db();
  const tx = conn.transaction(() => {
    const info = conn
      .prepare(`INSERT INTO posts (author, caption, created_at) VALUES (?, ?, ?)`)
      .run(input.author, input.caption, Date.now());
    const postId = Number(info.lastInsertRowid);
    const ins = conn.prepare(
      `INSERT INTO post_images (post_id, url, thumb_url, width, height, position)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    input.images.forEach((img, i) =>
      ins.run(postId, img.url, img.thumb_url, img.width, img.height, i)
    );
    return postId;
  });
  return tx();
}

export function toggleLike(postId: number, user: string): number {
  const conn = db();
  const existing = conn
    .prepare(`SELECT 1 FROM likes WHERE post_id=? AND user=?`)
    .get(postId, user);
  if (existing) {
    conn.prepare(`DELETE FROM likes WHERE post_id=? AND user=?`).run(postId, user);
  } else {
    conn.prepare(`INSERT INTO likes (post_id, user) VALUES (?, ?)`).run(postId, user);
  }
  return (conn.prepare(`SELECT COUNT(*) c FROM likes WHERE post_id=?`).get(postId) as { c: number }).c;
}
