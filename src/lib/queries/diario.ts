import "server-only"

import { auth } from "@/auth"
import { DIARIO_EMPTY, type DiarioState } from "@/lib/diario"
import { prisma } from "@/lib/prisma"

function fromRow(row: {
  mood: string | null
  obiettivo: string
  testo: string
  wins: string[]
  habits: unknown
  weight: number | null
  sleepHours: number | null
  pomodoroSessions: number
}): DiarioState {
  return {
    mood: (row.mood as DiarioState["mood"]) ?? null,
    obiettivo: row.obiettivo,
    testo: row.testo,
    wins: [row.wins[0] ?? "", row.wins[1] ?? "", row.wins[2] ?? ""],
    habits: (row.habits as Record<string, boolean>) ?? {},
    weight: row.weight,
    sleepHours: row.sleepHours,
    pomodoroSessions: row.pomodoroSessions,
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

/**
 * Voce di oggi + numero progressivo del giorno (quante voci di diario esistono
 * prima di oggi, +1 — indipendentemente dal fatto che quella di oggi sia già
 * stata salvata). Una sola andata e ritorno al DB per entrambi i dati.
 */
export async function getDiarioToday(
  date: string,
): Promise<{ state: DiarioState; dayNumber: number }> {
  const session = await auth()
  if (!session?.user?.id) return { state: DIARIO_EMPTY, dayNumber: 1 }

  const [row, countBefore] = await Promise.all([
    prisma.journalEntry.findUnique({
      where: { userId_date: { userId: session.user.id, date } },
    }),
    prisma.journalEntry.count({
      where: { userId: session.user.id, date: { lt: date } },
    }),
  ])

  return {
    state: row ? fromRow(row) : DIARIO_EMPTY,
    dayNumber: countBefore + 1,
  }
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

export type DiarioSearchHit = { date: string; snippet: string }

const SNIPPET_MAX = 140

/**
 * Cerca "quando ho scritto X" nel diario — solo in testo/obiettivo
 * (`contains`, case-insensitive, nativo su Postgres, nessuna estensione
 * richiesta). Non cerca dentro le abitudini (JSON, ricerca
 * strutturalmente diversa, nomi pochi e prevedibili): ricerca onesta su
 * quello che scrivi per davvero, non un'illusione di "cerca ovunque".
 */
export async function searchDiario(query: string, limit = 30): Promise<DiarioSearchHit[]> {
  const q = query.trim()
  if (!q) return []
  const session = await auth()
  if (!session?.user?.id) return []

  const rows = await prisma.journalEntry.findMany({
    where: {
      userId: session.user.id,
      OR: [
        { testo: { contains: q, mode: "insensitive" } },
        { obiettivo: { contains: q, mode: "insensitive" } },
      ],
    },
    orderBy: { date: "desc" },
    take: limit,
    select: { date: true, testo: true, obiettivo: true },
  })

  return rows.map((row) => {
    // Mostra il campo che ha davvero fatto scattare il risultato, non
    // sempre lo stesso — così si capisce perché quel giorno è comparso.
    const matchedTesto = row.testo.toLowerCase().includes(q.toLowerCase())
    const snippet = matchedTesto ? row.testo : row.obiettivo
    return {
      date: row.date,
      snippet: snippet.length > SNIPPET_MAX ? `${snippet.slice(0, SNIPPET_MAX)}…` : snippet,
    }
  })
}
