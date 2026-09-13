import { NextResponse } from "next/server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { exchangeSpotifyCode, requestOrigin } from "@/lib/spotify"

/**
 * Route statica allo stesso path che userebbe Auth.js (/api/auth/callback/
 * spotify) — in Next.js una route specifica come questa vince sul catch-all
 * di Auth.js (src/app/api/auth/[...nextauth]/route.ts) solo per QUESTO
 * path esatto, tutto il resto di /api/auth/* continua a passare da lì.
 * Fatto apposta: così il redirect URI già registrato sul pannello Spotify
 * (docs/SETUP-SPOTIFY.md) non deve cambiare, anche se qui non è Auth.js a
 * gestire lo scambio ma codice nostro (Spotify resta un collegamento a
 * parte, non un modo per accedere — vedi src/lib/spotify.ts).
 */
export async function GET(request: Request) {
  const origin = requestOrigin(request)
  const url = new URL(request.url)
  const session = await auth()
  const dashboardUrl = new URL("/dashboard", origin)

  if (!session?.user?.id) return NextResponse.redirect(new URL("/", origin))

  const error = url.searchParams.get("error")
  if (error) {
    dashboardUrl.searchParams.set("spotify_error", error)
    return NextResponse.redirect(dashboardUrl)
  }

  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const cookieState = request.headers
    .get("cookie")
    ?.match(/spotify_oauth_state=([^;]+)/)?.[1]

  if (!code || !state || state !== cookieState) {
    dashboardUrl.searchParams.set("spotify_error", "state_mismatch")
    return NextResponse.redirect(dashboardUrl)
  }

  try {
    const tokens = await exchangeSpotifyCode(code, origin)
    await prisma.spotifyConnection.upsert({
      where: { userId: session.user.id },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? undefined,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      },
      create: {
        userId: session.user.id,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? "",
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      },
    })
  } catch {
    dashboardUrl.searchParams.set("spotify_error", "exchange_failed")
    return NextResponse.redirect(dashboardUrl)
  }

  const response = NextResponse.redirect(dashboardUrl)
  response.cookies.delete("spotify_oauth_state")
  return response
}
