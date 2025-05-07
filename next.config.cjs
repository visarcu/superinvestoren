// next.config.cjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      // hier die eigentliche Host-Domain, nicht "images.financialmodelingprep.com"
      'financialmodelingprep.com',
    ],
    // optional statt domains:
    // remotePatterns: [
    //   {
    //     protocol: 'https',
    //     hostname: 'financialmodelingprep.com',
    //     port: '',
    //     pathname: '/image-stock/**',
    //   },
    // ],
  },
}

module.exports = nextConfig