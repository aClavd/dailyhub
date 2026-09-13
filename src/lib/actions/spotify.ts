"use server"

import { revalidatePath } from "next/cache"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getValidSpotifyAccessToken } from "@/lib/queries/spotify"
import {
  spotifyNext,
  spotifyPause,
  spotifyPrevious,
  spotifyResume,
  type SpotifyPlayerResult,
} from "@/lib/spotify"

/** Scollega Spotify (non tocca il login DailyHub, resta Google). */
export async function disconnectSpotify() {
  const session = await auth()
  if (!session?.user?.id) return
  await prisma.spotifyConnection.delete({ where: { userId: session.user.id } }).catch(() => {})
}

/** Piccola pausa dopo un salto traccia: Spotify impiega un istante a
 * riflettere il cambio sul dispositivo prima che "currently-playing"
 * mostri la nuova traccia — senza, la card si aggiorna con quella vecchia. */
async function settleAfterSkip() {
  await new Promise((resolve) => setTimeout(resolve, 400))
}

async function runPlayerCommand(
  command: (accessToken: string) => Promise<SpotifyPlayerResult>,
  { settle = false }: { settle?: boolean } = {},
) {
  const accessToken = await getValidSpotifyAccessToken()
  if (!accessToken) return
  await command(accessToken)
  if (settle) await settleAfterSkip()
  revalidatePath("/dashboard")
}

export async function resumeSpotifyPlayback() {
  await runPlayerCommand(spotifyResume)
}

export async function pauseSpotifyPlayback() {
  await runPlayerCommand(spotifyPause)
}

export async function nextSpotifyTrack() {
  await runPlayerCommand(spotifyNext, { settle: true })
}

export async function previousSpotifyTrack() {
  await runPlayerCommand(spotifyPrevious, { settle: true })
}
