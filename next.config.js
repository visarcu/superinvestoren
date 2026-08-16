/** @type {import('next').NextConfig} */
// Bewusst minimal. next.config.cjs daneben ist tot (wird von Next nie geladen),
// deren Alt-Inhalte NICHT hierher übernehmen — Redirects leben in src/middleware.ts.
const nextConfig = {
  typescript: {
    // Der Vercel-Build-Container (8 GB) stirbt beim Type-Check per OOM/SIGKILL —
    // tsc lädt u.a. die 38-MB-Holdings-JSONs komplett. Typprüfung läuft daher
    // lokal (`npx tsc --noEmit`) vor dem Push statt im Deploy-Build.
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig
