/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Remove experimental config since it's causing issues
  reactStrictMode: true,
}

export default nextConfig

