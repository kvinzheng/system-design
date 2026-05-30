import { listFeed } from "@/lib/db";
import Feed from "@/components/Feed";

export const dynamic = "force-dynamic";

// SSR the first page so logged-out users + crawlers get content immediately.
export default function Home() {
  const initial = listFeed({ limit: 5 });
  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Feed</h1>
      <Feed initial={initial} />
    </div>
  );
}
