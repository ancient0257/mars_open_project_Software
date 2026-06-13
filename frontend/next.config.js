/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,           // gzip all responses
  poweredByHeader: false,   // remove X-Powered-By: Next.js header
  // Disable source maps in production (saves ~30% bundle size)
  productionBrowserSourceMaps: false,
};

module.exports = nextConfig;
