"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getLettura, type LetturaState } from "@/lib/queries/lettura"

/** Sola lettura esposta come Server Action perché il blocco Lettura si
 * autoalimenta al mount (Client Component) — stesso schema di
 * fetchMonthEvents in actions/calendar.ts. */
export async function fetchLettura(): Promise<LetturaState> {
  return getLettura()
}

export async function saveLettura(data: LetturaState) {
  const session = await auth()
  if (!session?.user?.id) return
  await prisma.letturaWidget.upsert({
    where: { userId: session.user.id },
    update: data,
    create: { userId: session.user.id, ...data },
  })
}
