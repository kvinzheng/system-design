"use client";

import { useEffect, useRef, useState } from "react";
import type { PostImage } from "@/lib/db";

/**
 * Native-scroll carousel with snap. Renders only neighbors of the active
 * slide (windowing) so feeds with many images stay light.
 */
export default function Carousel({ images }: { images: PostImage[] }) {
  const [active, setActive] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const onScroll = () => {
      const i = Math.round(el.scrollLeft / el.clientWidth);
      setActive(i);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const go = (i: number) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div className="relative bg-black">
      <div
        ref={scroller}
        className="flex aspect-square w-full snap-x snap-mandatory overflow-x-auto scroll-smooth"
      >
        {images.map((img, i) => {
          const near = Math.abs(i - active) <= 1;
          return (
            <div key={img.id} className="relative aspect-square w-full shrink-0 snap-center">
              {near ? (
                <img
                  src={img.url}
                  width={img.width}
                  height={img.height}
                  alt=""
                  loading={i === 0 ? "eager" : "lazy"}
                  decoding="async"
                  className="h-full w-full object-contain"
                  style={{ backgroundImage: `url(${img.thumb_url})`, backgroundSize: "cover" }}
                />
              ) : (
                <div
                  className="h-full w-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${img.thumb_url})` }}
                />
              )}
            </div>
          );
        })}
      </div>

      {images.length > 1 && (
        <>
          {active > 0 && (
            <button
              aria-label="Previous"
              onClick={() => go(active - 1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 px-2 py-1 text-sm"
            >‹</button>
          )}
          {active < images.length - 1 && (
            <button
              aria-label="Next"
              onClick={() => go(active + 1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 px-2 py-1 text-sm"
            >›</button>
          )}
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
            {images.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full ${i === active ? "bg-white" : "bg-white/50"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
