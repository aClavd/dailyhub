import "server-only"

import { cache } from "react"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { fetchSpotifyNowPlaying, refreshSpotifyToken, type SpotifyNowPlaying } from "@/lib/spotify"

export type SpotifyStatus =
  | { connected: false }
  | { connected: true; nowPlaying: SpotifyNowPlaying }
  | { connected: true; error: true }

/**
 * Access token Spotify valido dell'utente corrente, rinnovandolo da solo
 * (e salvando il nuovo sul DB) se scaduto. `null` = non collegato, oppure
 * il rinnovo è fallito (serve ricollegare). Condivisa tra la lettura dello
 * stato qui sotto e i comandi di riproduzione (src/lib/actions/spotify.ts)
 * — un solo punto che sa come tenere il token fresco.
 */
export async function getValidSpotifyAccessToken(): Promise<string | null> {
  const session = await auth()
  if (!session?.user?.id) return null

  const connection = await prisma.spotifyConnection.findUnique({
    where: { userId: session.user.id },
  })
  if (!connection) return null

  if (connection.expiresAt.getTime() > Date.now() + 30_000) {
    return connection.accessToken
  }

  try {
    const refreshed = await refreshSpotifyToken(connection.refreshToken)
    await prisma.spotifyConnection.update({
      where: { userId: session.user.id },
      data: {
        accessToken: refreshed.access_token,
        refreshToken: refreshed.refresh_token ?? connection.refreshToken,
        expiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
      },
    })
    return refreshed.access_token
  } catch {
    return null
  }
}

/**
 * Stato Spotify dell'utente corrente: non collegato, in ascolto di
 * qualcosa (o niente), o un errore (token rifiutato anche dopo il
 * rinnovo — serve ricollegare).
 */
export const getSpotifyStatus = cache(async (): Promise<SpotifyStatus> => {
  const session = await auth()
  if (!session?.user?.id) return { connected: false }

  const hasConnection = await prisma.spotifyConnection.findUnique({
    where: { userId: session.user.id },
    select: { userId: true },
  })
  if (!hasConnection) return { connected: false }

  const accessToken = await getValidSpotifyAccessToken()
  if (!accessToken) return { connected: true, error: true }

  try {
    const nowPlaying = await fetchSpotifyNowPlaying(accessToken)
    return { connected: true, nowPlaying }
  } catch {
    return { connected: true, error: true }
  }
})
