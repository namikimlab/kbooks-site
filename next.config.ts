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
      { protocol: "https", hostname: "search1.kakaocdn.net", pathname: "/**" },
      { protocol: "https", hostname: "t1.daumcdn.net", pathname: "/**" },

    ],
  },
};

export default nextConfig;
