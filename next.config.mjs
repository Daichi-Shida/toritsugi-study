/** @type {import('next').NextConfig} */
const nextConfig = {
  // スマホからのLANアクセスを許可
  allowedDevOrigins: ["192.168.3.8"],
  // PWA対応（将来 next-pwa を追加する予定）
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-XSS-Protection", value: "1; mode=block" },
      ],
    },
  ],
};

export default nextConfig;
