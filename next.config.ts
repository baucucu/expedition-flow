import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  dev: {
    allowedDevOrigins: ['https://9000-firebase-studio-1755163419257.cluster-6vyo4gb53jczovun3dxslzjahs.cloudworkstations.dev'],
  },
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
