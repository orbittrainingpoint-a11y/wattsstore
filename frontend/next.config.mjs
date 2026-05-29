/** @type {import('next').NextConfig} */
const API_URL = process.env.API_PROXY_URL || 'http://localhost:4000';

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '9000' },
      { protocol: 'https', hostname: '**' },
    ],
  },
  // Proxy /api → Express so the browser sends same-origin cookies during dev.
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API_URL}/api/:path*` }];
  },
};

export default nextConfig;
