import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["openai"],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // pdfjs-dist is browser-only — exclude from server bundle
      config.externals = [...(config.externals ?? []), "pdfjs-dist"];
    }
    return config;
  },
};

export default nextConfig;
