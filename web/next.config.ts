import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a traced production server so the Docker runtime image contains only
  // the files required by this app instead of the complete dependency tree.
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
