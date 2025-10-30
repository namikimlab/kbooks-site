import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "http",  hostname: "www.nl.go.kr", pathname: "/**" }, // <-- add this
      { protocol: "https", hostname: "www.nl.go.kr", pathname: "/**" },
      { protocol: "https", hostname: "nl.go.kr",      pathname: "/**" },
      {
        protocol: "https",
        hostname: "nthahtfalfrrzesxlzhy.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
