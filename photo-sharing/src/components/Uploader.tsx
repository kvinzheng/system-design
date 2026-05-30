"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Selected = { file: File; preview: string; filter: string };

const FILTERS: Record<string, string> = {
  None: "none",
  Clarendon: "contrast(1.2) saturate(1.35)",
  Gingham: "brightness(1.05) hue-rotate(-10deg)",
  Moon: "grayscale(1) contrast(1.1) brightness(1.1)",
  Lark: "contrast(0.9) brightness(1.1) saturate(1.1)",
  Reyes: "sepia(0.22) brightness(1.1) contrast(0.85) saturate(0.75)",
  Juno: "saturate(1.4) contrast(1.1) hue-rotate(-10deg)",
};

export default function Uploader() {
  const router = useRouter();
  const [items, setItems] = useState<Selected[]>([]);
  const [active, setActive] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const submitting = useRef(false);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 10);
    setItems(files.map((file) => ({ file, preview: URL.createObjectURL(file), filter: "None" })));
    setActive(0);
  }

  function setFilter(name: string) {
    setItems((prev) => prev.map((it, i) => (i === active ? { ...it, filter: name } : it)));
  }

  /** Bake CSS filters into pixels client-side. */
  async function bake(it: Selected): Promise<{ blob: Blob; type: string }> {
    if (it.filter === "None") return { blob: it.file, type: it.file.type || "image/jpeg" };
    const img = await loadImage(it.preview);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.filter = FILTERS[it.filter];
    ctx.drawImage(img, 0, 0);
    const blob: Blob = await new Promise((res) =>
      canvas.toBlob((b) => res(b!), "image/jpeg", 0.92)
    );
    return { blob, type: "image/jpeg" };
  }

  async function uploadOne(it: Selected): Promise<string> {
    const { blob, type } = await bake(it);

    // 1) Ask the server for a presigned PUT (S3 in prod, local sink in dev).
    const presignRes = await fetch("/api/uploads/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentType: type, filename: it.file.name }),
    });
    if (!presignRes.ok) throw new Error("presign failed");
    const { uploadUrl, key, method } = await presignRes.json();

    // 2) Browser PUTs raw bytes directly to storage — no app-server hop.
    const putRes = await fetch(uploadUrl, {
      method,
      headers: { "Content-Type": type },
      body: blob,
    });
    if (!putRes.ok) throw new Error(`upload failed (${putRes.status})`);
    return key;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting.current) return;
    setError(null);
    if (items.length === 0) {
      setError("Pick at least one photo");
      return;
    }
    submitting.current = true;
    try {
      const fd = new FormData(e.currentTarget);
      const author = String(fd.get("author") || "anon");
      const caption = String(fd.get("caption") || "");

      const rawKeys: string[] = [];
      for (let i = 0; i < items.length; i++) {
        setProgress(`Uploading ${i + 1}/${items.length}…`);
        rawKeys.push(await uploadOne(items[i]));
      }

      // 3) Tell the server to process variants + persist the post.
      setProgress("Finalizing…");
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author, caption, rawKeys }),
      });
      if (!res.ok) throw new Error(await res.text());

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(String((err as Error).message));
      setProgress(null);
    } finally {
      submitting.current = false;
    }
  }

  const current = items[active];

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-lg border bg-white p-4">
      <input type="file" accept="image/*" multiple onChange={onPick} className="text-sm" />

      {current && (
        <div>
          <div className="overflow-hidden rounded bg-black">
            <img
              src={current.preview}
              alt=""
              className="mx-auto max-h-[60vh] object-contain"
              style={{ filter: FILTERS[current.filter] }}
            />
          </div>

          {items.length > 1 && (
            <div className="mt-2 flex gap-2 overflow-x-auto">
              {items.map((it, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => setActive(i)}
                  className={`relative h-14 w-14 shrink-0 overflow-hidden rounded border-2 ${
                    i === active ? "border-blue-600" : "border-transparent"
                  }`}
                >
                  <img
                    src={it.preview}
                    alt=""
                    className="h-full w-full object-cover"
                    style={{ filter: FILTERS[it.filter] }}
                  />
                </button>
              ))}
            </div>
          )}

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {Object.keys(FILTERS).map((name) => (
              <button
                type="button"
                key={name}
                onClick={() => setFilter(name)}
                className={`shrink-0 rounded px-3 py-1 text-xs ${
                  current.filter === name ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      <input
        name="author"
        placeholder="Your name"
        defaultValue="demo-user"
        maxLength={40}
        className="rounded border px-3 py-2 text-sm"
      />
      <textarea
        name="caption"
        placeholder="Write a caption…"
        maxLength={2000}
        rows={3}
        className="resize-none rounded border px-3 py-2 text-sm"
      />

      {progress && <p className="text-sm text-gray-500">{progress}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={progress !== null || items.length === 0}
        className="self-end rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {progress ? "Working…" : "Share"}
      </button>
    </form>
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}
