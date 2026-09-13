"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getSpotifyStatus, getValidSpotifyAccessToken, type SpotifyStatus } from "@/lib/queries/spotify"
import { spotifyNext, spotifyPause, spotifyPrevious, spotifyResume, type SpotifyPlayerResult } from "@/lib/spotify"

/** Scollega Spotify (non tocca il login DailyHub, resta Google). */
export async function disconnectSpotify() {
  const session = await auth()
  if (!session?.user?.id) return
  await prisma.spotifyConnection.delete({ where: { userId: session.user.id } }).catch(() => {})
}

/** Piccola pausa dopo un comando: Spotify impiega un istante a riflettere
 * il cambio (traccia, play/pausa) sul dispositivo prima che
 * "currently-playing" lo mostri — senza, la rilettura qui sotto vedrebbe
 * ancora lo stato precedente. Vale per tutti e 4 i comandi, non solo per i
 * salti traccia (era il bug: play/pausa rileggevano a delay zero). */
async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 400))
}

/**
 * Esegue un comando e ritorna lo stato vero, riletto da Spotify subito
 * dopo — il chiamante (client) aggiorna la card con QUESTO valore diretto,
 * invece di affidarsi al refresh automatico di Next dopo una Server
 * Action: quel refresh passa da un'altra richiesta (il payload RSC della
 * pagina) che in dev può fallire per conto suo (visto coi log di Safari:
 * "Failed to fetch RSC payload... Load failed") — il comando arrivava a
 * Spotify e funzionava, ma la card restava ferma perché quel secondo giro
 * non tornava mai indietro. Ritornare lo stato dalla action stessa evita
 * del tutto quel giro. Se il comando fallisce (403 niente Premium, 404
 * nessun dispositivo attivo) lo stato riletto è comunque quello vero —
 * niente aggiornamento "ottimistico" che poi mente.
 */
async function runPlayerCommand(
  command: (accessToken: string) => Promise<SpotifyPlayerResult>,
): Promise<SpotifyStatus> {
  const accessToken = await getValidSpotifyAccessToken()
  if (accessToken) {
    await command(accessToken)
    await settle()
  }
  return getSpotifyStatus()
}

export async function resumeSpotifyPlayback(): Promise<SpotifyStatus> {
  return runPlayerCommand(spotifyResume)
}

export async function pauseSpotifyPlayback(): Promise<SpotifyStatus> {
  return runPlayerCommand(spotifyPause)
}

export async function nextSpotifyTrack(): Promise<SpotifyStatus> {
  return runPlayerCommand(spotifyNext)
}

export async function previousSpotifyTrack(): Promise<SpotifyStatus> {
  return runPlayerCommand(spotifyPrevious)
}
