"use server"

// Sole letture, ma esposte come Server Action: servono a un componente
// client interattivo (cambio mese/settimana, ricerca) — queries/diario.ts
// è esplicitamente solo per Server Component. Stesso schema già usato
// per i comandi Spotify (src/lib/actions/spotify.ts): la logica vera
// resta nelle query, qui solo un ponte chiamabile dal client.

import {
  getDiarioEntry,
  getDiarioHistory,
  searchDiario,
  type DiarioSearchHit,
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
