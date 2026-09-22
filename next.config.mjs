/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ljejfdquofuxccca.public.blob.vercel-storage.com',
      },
    ],
  },
};

export default nextConfig;