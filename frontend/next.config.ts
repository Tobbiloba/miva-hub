import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const BUILD_OUTPUT = process.env.NEXT_STANDALONE_OUTPUT
  ? "standalone"
  : undefined;

// HSTS only makes sense when the app is actually served over HTTPS.
// NO_HTTPS=1 is the existing escape hatch for plain-HTTP self-hosting.
const ENABLE_HSTS =
  process.env.NODE_ENV === "production" && process.env.NO_HTTPS !== "1";

// Sentry is opt-in: without a DSN the build is not wrapped at all, and the
// runtime init files skip Sentry.init (see sentry.*.config.ts).
const SENTRY_ENABLED = Boolean(
  process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
);
const SENTRY_CAN_UPLOAD_SOURCEMAPS = Boolean(process.env.SENTRY_AUTH_TOKEN);

const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // SAMEORIGIN (not DENY): PDF viewers may iframe same-origin file URLs.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // frame-ancestors only — a script-src CSP would break Next's inline scripts.
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
  // Voice chat / viva / office hours need the mic on our own origin.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(self), geolocation=(), browsing-topics=()",
  },
  ...(ENABLE_HSTS
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains",
        },
      ]
    : []),
];

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
    async headers() {
      return [{ source: "/:path*", headers: SECURITY_HEADERS }];
    },
    webpack: (config, { isServer }) => {
      if (!isServer) {
        // Prevent PostgreSQL and Node.js modules from being bundled on client-side
        config.externals = config.externals || [];
        config.externals.push({
          pg: "commonjs pg",
          "pg-native": "commonjs pg-native",
          "pg-connection-string": "commonjs pg-connection-string",
          pgpass: "commonjs pgpass",
          dns: "commonjs dns",
          fs: "commonjs fs",
          net: "commonjs net",
          tls: "commonjs tls",
          crypto: "commonjs crypto",
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
          "pg-native": false,
          "pg-connection-string": false,
          pgpass: false,
        };
      }
      return config;
    },

    // Additional configuration for server-only modules
    serverExternalPackages: [
      "pg",
      "pg-native",
      "pg-connection-string",
      "pgpass",
    ],

    // Image configuration
    images: {
      remotePatterns: [
        {
          protocol: "https",
          hostname: "cdn.dribbble.com",
          port: "",
          pathname: "/**",
        },
      ],
    },
  };
  const withNextIntl = createNextIntlPlugin();
  const config = withNextIntl(nextConfig);
  if (!SENTRY_ENABLED) return config;
  return withSentryConfig(config, {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,
    silent: !process.env.CI,
    telemetry: false,
    widenClientFileUpload: true,
    // Builds must never require SENTRY_AUTH_TOKEN: upload only when present.
    sourcemaps: { disable: !SENTRY_CAN_UPLOAD_SOURCEMAPS },
    release: {
      create: SENTRY_CAN_UPLOAD_SOURCEMAPS,
      finalize: SENTRY_CAN_UPLOAD_SOURCEMAPS,
    },
  });
};
