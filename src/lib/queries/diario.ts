import "server-only"

import { auth } from "@/auth"
import { DIARIO_EMPTY, type DiarioState } from "@/lib/diario"
import { prisma } from "@/lib/prisma"

function fromRow(row: {
  mood: string | null
  obiettivo: string
  testo: string
  wins: string[]
}): DiarioState {
  return {
    mood: (row.mood as DiarioState["mood"]) ?? null,
    obiettivo: row.obiettivo,
    testo: row.testo,
    wins: [row.wins[0] ?? "", row.wins[1] ?? "", row.wins[2] ?? ""],
  }
}

/**
 * Voce di diario di un giorno. Solo lettura, solo per Server Component —
 * non importare questo file da un Client Component.
 */
export async function getDiarioEntry(date: string): Promise<DiarioState> {
  const session = await auth()
  if (!session?.user?.id) return DIARIO_EMPTY
  const row = await prisma.journalEntry.findUnique({
    where: { userId_date: { userId: session.user.id, date } },
  })
  return row ? fromRow(row) : DIARIO_EMPTY
}

/** Voci di diario per un elenco di giorni, indicizzate per data. */
export async function getDiarioHistory(
  dates: string[],
): Promise<Record<string, DiarioState>> {
  const session = await auth()
  if (!session?.user?.id) return {}
  const rows = await prisma.journalEntry.findMany({
    where: { userId: session.user.id, date: { in: dates } },
  })
  const byDate: Record<string, DiarioState> = {}
  for (const row of rows) byDate[row.date] = fromRow(row)
  return byDate
}
