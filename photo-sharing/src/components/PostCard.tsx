"use client";

import { useState } from "react";
import Carousel from "./Carousel";
import type { Post } from "@/lib/db";

export default function PostCard({ post }: { post: Post }) {
  const [likes, setLikes] = useState(post.likes);
  const [liked, setLiked] = useState(false);

  async function onLike() {
    setLiked((v) => !v);
    const res = await fetch("/api/like", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId: post.id, user: "demo-user" }),
    });
    const { likes } = await res.json();
    setLikes(likes);
  }

  return (
    <article className="overflow-hidden rounded-lg border bg-white">
      <header className="flex items-center justify-between px-4 py-3">
        <div className="font-medium">@{post.author}</div>
        <time className="text-xs text-gray-500">
          {new Date(post.created_at).toLocaleString()}
        </time>
      </header>

      <Carousel images={post.images} />

      <div className="flex items-center gap-4 px-4 py-2">
        <button
          onClick={onLike}
          aria-pressed={liked}
          className={`text-xl transition ${liked ? "text-red-500" : "text-gray-700"}`}
        >
          {liked ? "♥" : "♡"}
        </button>
        <span className="text-sm font-medium">{likes} likes</span>
      </div>

      {post.caption && (
        <p className="whitespace-pre-wrap px-4 pb-4 text-sm">
          <span className="mr-2 font-medium">@{post.author}</span>
          {post.caption}
        </p>
      )}
    </article>
  );
}
