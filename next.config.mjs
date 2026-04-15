import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 仅本地开发使用独立目录，避免污染生产构建产物（vercel/next-on-pages 期望默认 .next）
  ...(process.env.NODE_ENV === "development" ? { distDir: ".next-dev" } : {}),
};

if (process.env.NODE_ENV === "development") {
  await initOpenNextCloudflareForDev();
}

export default nextConfig;
