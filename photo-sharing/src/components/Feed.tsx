"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PostCard from "./PostCard";
import type { Post } from "@/lib/db";

type Page = { items: Post[]; nextCursor: number | null };

export default function Feed({ initial }: { initial: Page }) {
  const [items, setItems] = useState<Post[]>(initial.items);
  const [cursor, setCursor] = useState<number | null>(initial.nextCursor);
  const [loading, setLoading] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (loading || cursor === null) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/feed?cursor=${cursor}&limit=5`);
      const page: Page = await res.json();
      setItems((prev) => [...prev, ...page.items]);
      setCursor(page.nextCursor);
    } finally {
      setLoading(false);
    }
  }, [cursor, loading]);

  // IntersectionObserver-driven infinite scroll
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => entries[0].isIntersecting && loadMore(),
      { rootMargin: "600px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore]);

  if (items.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
        No posts yet. <a href="/upload" className="text-blue-600 underline">Create the first one</a>.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {items.map((p) => <PostCard key={p.id} post={p} />)}
      <div ref={sentinel} className="h-8 text-center text-sm text-gray-400">
        {cursor === null ? "— end —" : loading ? "Loading…" : ""}
      </div>
    </div>
  );
}
