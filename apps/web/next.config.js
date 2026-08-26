/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@revenue-radar/shared']
}

module.exports = nextConfig
