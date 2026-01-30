import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Empty turbopack config to acknowledge we're using it
  turbopack: {},

  // Transpile iExec packages
  transpilePackages: ['@iexec/dataprotector', 'iexec'],
};

export default nextConfig;
