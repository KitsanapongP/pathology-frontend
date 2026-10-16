import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  ...(process.env.GITHUB_PAGES === "true" ? {
    output: "export" as const,
    trailingSlash: true,
    distDir: ".next-pages",
    images: { unoptimized: true },
  } : {}),
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
