import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Ancora la root al progetto: c'è un package-lock.json nella home che
  // altrimenti Turbopack considera come possibile workspace root.
  turbopack: {
    root: import.meta.dirname,
  },
  images: {
    // Foto profilo Google (avatar utente).
    remotePatterns: [{ protocol: "https", hostname: "lh3.googleusercontent.com" }],
  },
}

export default nextConfig
