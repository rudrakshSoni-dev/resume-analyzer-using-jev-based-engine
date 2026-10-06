const API_URL = (process.env.API_URL || 'http://localhost:3002').replace(/\/+$/, '');
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API_URL}/api/:path*` }];
  },
};

export default nextConfig;
