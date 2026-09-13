import { randomBytes } from "node:crypto"

import { NextResponse } from "next/server"

import { auth } from "@/auth"
import { spotifyAuthorizeUrl } from "@/lib/spotify"

/**
 * Avvia il collegamento Spotify: genera uno state anti-CSRF (in un cookie
 * di breve durata, verificato al ritorno dal callback) e manda l'utente da
 * Spotify. Richiede una sessione DailyHub già attiva (Google) — Spotify si
 * collega a un account esistente, non è un modo per accedere.
 */
export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  const state = randomBytes(16).toString("hex")
  const origin = new URL(request.url).origin
  const response = NextResponse.redirect(spotifyAuthorizeUrl(origin, state))
  response.cookies.set("spotify_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: origin.startsWith("https://"),
    maxAge: 600,
    path: "/",
  })
  return response
}
