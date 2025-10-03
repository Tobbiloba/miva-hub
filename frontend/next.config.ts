import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const BUILD_OUTPUT = process.env.NEXT_STANDALONE_OUTPUT
  ? "standalone"
  : undefined;

export default () => {
  const nextConfig: NextConfig = {
    output: BUILD_OUTPUT,
    cleanDistDir: true,
    devIndicators: {
      position: "bottom-right",
    },
    typescript: {
      // ⚠️ Dangerously allow production builds to successfully complete even if
      // your project has type errors.
      ignoreBuildErrors: true,
    },
    env: {
      NO_HTTPS: process.env.NO_HTTPS,
    },
    experimental: {
      taint: true,
    },
    webpack: (config, { isServer }) => {
      if (!isServer) {
        // Prevent PostgreSQL and Node.js modules from being bundled on client-side
        config.externals = config.externals || [];
        config.externals.push({
          pg: 'commonjs pg',
          'pg-native': 'commonjs pg-native', 
          'pg-connection-string': 'commonjs pg-connection-string',
          pgpass: 'commonjs pgpass',
          dns: 'commonjs dns',
          fs: 'commonjs fs',
          net: 'commonjs net',
          tls: 'commonjs tls',
          crypto: 'commonjs crypto',
        });

        // Additional module resolution rules for Turbopack
        config.resolve = config.resolve || {};
        config.resolve.fallback = {
          ...config.resolve.fallback,
          dns: false,
          fs: false,
          net: false,
          tls: false,
          crypto: false,
          pg: false,
          'pg-native': false,
          'pg-connection-string': false,
          pgpass: false,
        };
      }
      return config;
    },
    
    // Additional configuration for server-only modules
    serverExternalPackages: ['pg', 'pg-native', 'pg-connection-string', 'pgpass'],
  };
  const withNextIntl = createNextIntlPlugin();
  return withNextIntl(nextConfig);
};
