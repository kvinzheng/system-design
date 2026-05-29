import { useCallback, useEffect, useRef, useState } from "react";
import { fetchPins } from "../api.js";

/**
 * Manages cursor-paginated feed state. Prevents overlapping requests and
 * preserves server-side ordering by appending pages in the order they
 * were requested.
 */
export function usePinFeed({ pageSize = 24 } = {}) {
  const [pins, setPins] = useState([]);
  const [cursor, setCursor] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Refs guard against re-entrant loads from rapid scroll events / StrictMode.
  const inflightRef = useRef(false);
  const cursorRef = useRef(0);
  const hasMoreRef = useRef(true);

  const loadMore = useCallback(async () => {
    if (inflightRef.current || !hasMoreRef.current) return;
    inflightRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const { items, nextCursor } = await fetchPins({
        cursor: cursorRef.current,
        limit: pageSize,
      });
      setPins((prev) => {
        // Dedupe by id in case of any double-fire.
        const seen = new Set(prev.map((p) => p.id));
        const merged = prev.slice();
        for (const it of items) if (!seen.has(it.id)) merged.push(it);
        return merged;
      });
      const next = nextCursor ?? null;
      cursorRef.current = next ?? cursorRef.current + items.length;
      setCursor(cursorRef.current);
      const more = next !== null;
      hasMoreRef.current = more;
      setHasMore(more);
    } catch (e) {
      setError(e);
    } finally {
      inflightRef.current = false;
      setLoading(false);
    }
  }, [pageSize]);

  // Initial load.
  useEffect(() => {
    loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { pins, cursor, hasMore, loading, error, loadMore };
}
