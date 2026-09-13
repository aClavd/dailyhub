import "server-only"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { fetchSpotifyNowPlaying, refreshSpotifyToken, type SpotifyNowPlaying } from "@/lib/spotify"

export type SpotifyStatus =
  | { connected: false }
  | { connected: true; nowPlaying: SpotifyNowPlaying }
  | { connected: true; error: true }

/**
 * Stato Spotify dell'utente corrente: non collegato, in ascolto di
 * qualcosa (o niente), o un errore (token rifiutato anche dopo il
 * rinnovo — serve ricollegare). Rinnova da sola l'access token scaduto,
 * salvando il nuovo sul DB: è un "leggi" dal punto di vista di chi la
 * chiama, il rinnovo è un dettaglio interno necessario per farlo.
 */
export async function getSpotifyStatus(): Promise<SpotifyStatus> {
  const session = await auth()
  if (!session?.user?.id) return { connected: false }

  const connection = await prisma.spotifyConnection.findUnique({
    where: { userId: session.user.id },
  })
  if (!connection) return { connected: false }

  let accessToken = connection.accessToken
  if (connection.expiresAt.getTime() <= Date.now() + 30_000) {
    try {
      const refreshed = await refreshSpotifyToken(connection.refreshToken)
      accessToken = refreshed.access_token
      await prisma.spotifyConnection.update({
        where: { userId: session.user.id },
        data: {
          accessToken: refreshed.access_token,
          refreshToken: refreshed.refresh_token ?? connection.refreshToken,
          expiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
        },
      })
    } catch {
      return { connected: true, error: true }
    }
  }

  try {
    const nowPlaying = await fetchSpotifyNowPlaying(accessToken)
    return { connected: true, nowPlaying }
  } catch {
    return { connected: true, error: true }
  }
}
