import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Pin from "./Pin.jsx";

/**
 * Masonry layout using absolute positioning + a "shortest column first"
 * placement strategy. This matches the approach Pinterest's open-source
 * Masonry component takes and gives us:
 *
 *  - Stable column ordering (pins flow into the next-available shortest
 *    column, preserving server feed ranking visually top-to-bottom).
 *  - O(n) layout — each pin is placed in one pass using a column-heights
 *    array; no expensive reflow per card.
 *  - No CMS layout shift — we use the intrinsic width/height the API
 *    returns to reserve space before the image loads.
 *  - Cheap re-renders — only the container height and per-pin
 *    {left, top} change when the viewport resizes.
 *
 * Infinite scroll is wired via an IntersectionObserver sentinel that
 * sits below the grid; when it enters the viewport we call onEndReached.
 */
export default function Masonry({
  items,
  columnWidth = 236,
  gutter = 16,
  onEndReached,
  hasMore,
  loading,
}) {
  const containerRef = useRef(null);
  const sentinelRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Track container width with ResizeObserver so layout reflows on resize.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setContainerWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Compute column count from available width.
  const columnCount = Math.max(
    1,
    Math.floor((containerWidth + gutter) / (columnWidth + gutter))
  );

  // Compute positions in a single pass: place each pin in the currently
  // shortest column, then bump that column's running height.
  const { positions, totalHeight } = useMemo(() => {
    if (containerWidth === 0) return { positions: [], totalHeight: 0 };

    // Center the grid: distribute leftover horizontal space as outer margin.
    const usedWidth = columnCount * columnWidth + (columnCount - 1) * gutter;
    const offsetX = Math.max(0, (containerWidth - usedWidth) / 2);

    const colHeights = new Array(columnCount).fill(0);
    const positions = new Array(items.length);

    for (let i = 0; i < items.length; i++) {
      const pin = items[i];
      // Scale intrinsic height to the column width to preserve aspect ratio.
      const scaledImageHeight = Math.round((pin.height / pin.width) * columnWidth);
      // Card height = image + meta area (title + author).
      const cardHeight = scaledImageHeight + 60;

      // Find shortest column (ties go to the leftmost column, which
      // preserves left-to-right reading order for items of equal rank).
      let shortest = 0;
      for (let c = 1; c < columnCount; c++) {
        if (colHeights[c] < colHeights[shortest]) shortest = c;
      }

      const left = offsetX + shortest * (columnWidth + gutter);
      const top = colHeights[shortest];

      positions[i] = { left, top, imageHeight: scaledImageHeight, cardHeight };
      colHeights[shortest] = top + cardHeight + gutter;
    }

    return {
      positions,
      totalHeight: Math.max(0, ...colHeights) - gutter,
    };
  }, [items, columnCount, columnWidth, gutter, containerWidth]);

  // Infinite scroll sentinel.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !onEndReached) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && hasMore && !loading) {
            onEndReached();
          }
        }
      },
      { rootMargin: "1200px 0px" } // start loading well before bottom
    );
    io.observe(node);
    return () => io.disconnect();
  }, [onEndReached, hasMore, loading]);

  return (
    <div className="masonry" ref={containerRef}>
      <div
        className="masonry__grid"
        style={{ height: totalHeight, position: "relative" }}
      >
        {items.map((pin, i) => {
          const pos = positions[i];
          if (!pos) return null;
          return (
            <div
              key={pin.id}
              className="masonry__item"
              style={{
                position: "absolute",
                transform: `translate3d(${pos.left}px, ${pos.top}px, 0)`,
                width: columnWidth,
              }}
            >
              <Pin pin={pin} width={columnWidth} imageHeight={pos.imageHeight} />
            </div>
          );
        })}
      </div>

      <div ref={sentinelRef} className="masonry__sentinel" aria-hidden="true" />

      {loading && (
        <div className="masonry__loader" role="status" aria-live="polite">
          <div className="masonry__spinner" />
          <span>Loading more pins…</span>
        </div>
      )}
    </div>
  );
}
