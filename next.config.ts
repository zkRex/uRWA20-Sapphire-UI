import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'why-is-node-running': false,
    };

    config.module.rules.push({
      test: /node_modules\/.*\/test\//,
      loader: 'null-loader',
    });

    return config;
  },
};

export default nextConfig;
