// next.config.cjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'financialmodelingprep.com',
      'logo.clearbit.com',
    ],
  },
}

module.exports = nextConfig

module.exports = {
  images: { domains: ['logo.clearbit.com'] },
}