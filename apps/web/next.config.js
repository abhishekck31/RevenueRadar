/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@revenue-radar/shared'],
  experimental: {
    optimizePackageImports: ['lucide-react']
  },

  // The dashboard renders customer email, reasoning text and raw webhook
  // metadata, so it is worth denying framing and MIME sniffing outright.
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Blocks clickjacking — nothing here is meant to be embedded.
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'X-DNS-Prefetch-Control', value: 'off' }
        ]
      }
    ]
  }
}

module.exports = nextConfig
