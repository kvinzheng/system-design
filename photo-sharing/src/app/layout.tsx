import "./globals.css";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata = {
  title: "PhotoShare",
  description: "A minimal photo sharing app",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
          <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-xl font-bold">PhotoShare</Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/" className="hover:underline">Feed</Link>
              <Link href="/upload" className="font-medium text-blue-600 hover:underline">+ New Post</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-2xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
