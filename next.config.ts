import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Attempt to disable Next.js DevTools in dev
  // Note: If running on older Next, this will be ignored.
  // TS type mismatches are tolerated by ignoreBuildErrors above.
  // @ts-expect-error next may not declare this yet in your version
  devtools: { enabled: false },
  devIndicators: {
    buildActivity: false,
    // @ts-expect-error older Next may not have this flag
    appIsrStatus: false,
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
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
