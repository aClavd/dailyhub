"use server"

// Sole letture, ma esposte come Server Action: servono a un componente
// client interattivo (cambio mese/settimana, ricerca) — queries/diario.ts
// è esplicitamente solo per Server Component. Stesso schema già usato
// per i comandi Spotify (src/lib/actions/spotify.ts): la logica vera
// resta nelle query, qui solo un ponte chiamabile dal client.

import {
  getDiarioEntry,
  getDiarioHistory,
  getDiarioRange,
  getDiarioStreaks,
  getHabitStreaks,
  searchDiario,
  type DiarioSearchHit,
  type DiarioStreaks,
} from "@/lib/queries/diario"
import type { DiarioState } from "@/lib/diario"

export async function fetchDiarioHistory(dates: string[]): Promise<Record<string, DiarioState>> {
  return getDiarioHistory(dates)
}

export async function fetchDiarioEntry(date: string): Promise<DiarioState> {
  return getDiarioEntry(date)
}

export async function searchDiarioAction(query: string): Promise<DiarioSearchHit[]> {
  return searchDiario(query)
}

/** Ponte per la scheda Andamento (insights-dialog.tsx) — riuso dello
 * stesso schema di fetchDiarioHistory sopra. */
export async function fetchDiarioRange(
  start: string,
  end: string,
): Promise<Record<string, DiarioState>> {
  return getDiarioRange(start, end)
}

export async function fetchDiarioStreaks(): Promise<DiarioStreaks> {
  return getDiarioStreaks()
}

/** Ponte per la sezione Habits della scheda Andamento (insights-dialog.tsx). */
export async function fetchHabitStreaks(habitNames: string[]): Promise<Record<string, DiarioStreaks>> {
  return getHabitStreaks(habitNames)
}
