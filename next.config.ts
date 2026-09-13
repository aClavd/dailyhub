import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Ancora la root al progetto: c'è un package-lock.json nella home che
  // altrimenti Turbopack considera come possibile workspace root.
  turbopack: {
    root: import.meta.dirname,
  },
  // Dev su 127.0.0.1 (richiesto da Spotify, vedi docs/SETUP-SPOTIFY.md):
  // senza questo Next blocca le risorse HMR come "cross-origin" e, ancora
  // peggio, `request.url` nelle route resta fissato su localhost anche
  // quando l'header Host reale è 127.0.0.1 (causa reale del
  // redirect_uri_mismatch di Google — vedi commit).
  allowedDevOrigins: ["127.0.0.1"],
  images: {
    // Foto profilo Google (avatar utente).
    remotePatterns: [{ protocol: "https", hostname: "lh3.googleusercontent.com" }],
  },
}

export default nextConfig
