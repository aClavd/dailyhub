import "server-only"

import { auth } from "@/auth"
import { addDays, chiaveGiorno, parseChiave } from "@/lib/datetime"
import { DIARIO_EMPTY, isDiarioEntryEmpty, type DiarioState } from "@/lib/diario"
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

/** Voci di diario in un intervallo [start, end] (chiavi "YYYY-MM-DD",
 * estremi inclusi) — stessa forma di getDiarioHistory ma via `gte`/`lte`
 * invece di un elenco di chiavi: più efficiente per un intervallo lungo
 * (es. un anno intero, scheda Andamento) di quanto lo sarebbe costruire
 * 365 chiavi a mano. */
export async function getDiarioRange(
  start: string,
  end: string,
): Promise<Record<string, DiarioState>> {
  const session = await auth()
  if (!session?.user?.id) return {}
  const rows = await prisma.journalEntry.findMany({
    where: { userId: session.user.id, date: { gte: start, lte: end } },
  })
  const byDate: Record<string, DiarioState> = {}
  for (const row of rows) byDate[row.date] = fromRow(row)
  return byDate
}

export type DiarioStreaks = { current: number; longest: number }

/** Cammina su un elenco di chiavi giorno ORDINATE crescenti (uniche) e
 * calcola la serie più lunga di giorni consecutivi e quella attuale.
 * "Attuale" conta solo se l'ultimo giorno attivo è oggi o ieri (un giorno
 * di margine per chi non ha ancora scritto nulla oggi) — altrimenti la
 * serie è interrotta, non ha senso mostrarne una. Pura, testabile a
 * parte da una query DB. */
export function computeStreaks(activeDatesAsc: string[]): DiarioStreaks {
  if (activeDatesAsc.length === 0) return { current: 0, longest: 0 }

  let longest = 1
  let run = 1
  for (let i = 1; i < activeDatesAsc.length; i++) {
    const diffDays = Math.round(
      (parseChiave(activeDatesAsc[i]).getTime() - parseChiave(activeDatesAsc[i - 1]).getTime()) /
        86_400_000,
    )
    run = diffDays === 1 ? run + 1 : 1
    longest = Math.max(longest, run)
  }

  const today = chiaveGiorno()
  const yesterday = chiaveGiorno(addDays(new Date(), -1))
  const lastActive = activeDatesAsc[activeDatesAsc.length - 1]
  if (lastActive !== today && lastActive !== yesterday) return { current: 0, longest }

  let current = 1
  for (let i = activeDatesAsc.length - 1; i > 0; i--) {
    const diffDays = Math.round(
      (parseChiave(activeDatesAsc[i]).getTime() - parseChiave(activeDatesAsc[i - 1]).getTime()) /
        86_400_000,
    )
    if (diffDays !== 1) break
    current += 1
  }
  return { current, longest }
}

/** Serie di giorni consecutivi con attività (vedi isDiarioEntryEmpty) —
 * guarda SEMPRE tutta la storia dell'utente, non solo il periodo in vista
 * nella scheda Andamento: una serie "di 9 giorni" non avrebbe senso
 * tagliata alla settimana corrente. */
export async function getDiarioStreaks(): Promise<DiarioStreaks> {
  const session = await auth()
  if (!session?.user?.id) return { current: 0, longest: 0 }
  const rows = await prisma.journalEntry.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "asc" },
  })
  const activeDates = rows.filter((row) => !isDiarioEntryEmpty(fromRow(row))).map((row) => row.date)
  return computeStreaks(activeDates)
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
