import type { NextConfig } from "next";

// Tarayıcı API'ye aynı adresten (/api) ulaşır; böylece tek port dışarı açılarak demo paylaşılabilir
const API_ORIGIN = process.env.API_ORIGIN ?? "http://localhost:4001";

const nextConfig: NextConfig = {
  devIndicators: false,
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_ORIGIN}/api/:path*` }];
  },
};

export default nextConfig;
