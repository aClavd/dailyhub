"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

/** Scollega Spotify (non tocca il login DailyHub, resta Google). */
export async function disconnectSpotify() {
  const session = await auth()
  if (!session?.user?.id) return
  await prisma.spotifyConnection.delete({ where: { userId: session.user.id } }).catch(() => {})
}
