// next.config.js

const webpack = require('webpack');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // pdf-parse braucht native Node.js Module — nicht durch Webpack bundeln
  // Next.js 13.x: experimental.serverComponentsExternalPackages (ab 14: serverExternalPackages)
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'pdf-parse/lib/pdf-parse'],
  },

  images: {
    domains: [
      'financialmodelingprep.com',
      'logo.clearbit.com',
    ],
  },

  // Ab Next.js 12+ kannst du Warnungen via ignoreWarnings unterdrücken
  ignoreWarnings: [
    {
      // unterdrückt genau diese "Critical dependency"-Warnung
      message: /Critical dependency: the request of a dependency is an expression/,
    },
  ],

  webpack(config, { isServer }) {
    // =====================================================
    // A) Alias: Verhindere, dass @supabase/realtime-js überhaupt gebündelt wird
    // =====================================================
    config.resolve.alias['@supabase/realtime-js'] = false;

    // =====================================================
    // B) IgnorePlugin: Ignoriere alle Versuche, `@supabase/realtime-js` zu importieren
    // =====================================================
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^@supabase\/realtime-js$/,
      })
    );

    // =====================================================
    // C) pdf-parse als External markieren (nicht bundeln)
    //    pdf-parse verwendet dynamische require() für pdfjs-dist Versionen
    //    und native Node.js Module (fs, path) die Webpack nicht verarbeiten kann
    // =====================================================
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('pdf-parse');
      config.externals.push('pdf-parse/lib/pdf-parse');
    }

    return config;
  },
};

// Add redirects to the config
nextConfig.redirects = async () => {
  return [
    {
      source: '/analyse/stocks/:ticker/social',
      destination: '/analyse/stocks/:ticker/news',
      permanent: true,
    },
    {
      source: '/news',
      destination: '/blog',
      permanent: true,
    },
    {
      source: '/news/:slug',
      destination: '/blog/:slug',
      permanent: true,
    },
  ]
}

module.exports = nextConfig;