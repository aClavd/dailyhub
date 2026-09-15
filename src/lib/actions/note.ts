"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getNote } from "@/lib/queries/note"

/** Sola lettura esposta come Server Action perché il blocco Note si
 * autoalimenta al mount (Client Component) — stesso schema di
 * fetchMonthEvents in actions/calendar.ts. */
export async function fetchNote(): Promise<string> {
  return getNote()
}

export async function saveNote(text: string) {
  const session = await auth()
  if (!session?.user?.id) return
  await prisma.noteWidget.upsert({
    where: { userId: session.user.id },
    update: { text },
    create: { userId: session.user.id, text },
  })
}
