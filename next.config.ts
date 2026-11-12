import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // No registrar los argumentos de las server actions (llevan PINs) ni en desarrollo.
  logging: { serverFunctions: false },
  partialPrefetching: true,
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
