/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@revenue-radar/shared'],
  experimental: {
    optimizePackageImports: ['lucide-react']
  }
}

module.exports = nextConfig
