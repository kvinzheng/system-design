/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverComponentsExternalPackages: ["better-sqlite3", "sharp"] },
  images: { remotePatterns: [{ protocol: "http", hostname: "**" }] },
};
export default nextConfig;
