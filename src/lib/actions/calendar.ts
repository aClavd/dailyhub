"use server"

import {
  createEvent,
  getMonthEvents,
  getTodayEvents,
  type CalendarResult,
  type CreateEventInput,
} from "@/lib/google/calendar"

export type CreateCalendarEventResult =
  | { ok: true }
  | { ok: false; reason: "unauthenticated" | "token" | "api"; detail?: string }

/**
 * Crea l'evento su Google Calendar — non rilegge nulla da sé: due punti
 * d'ingresso diversi lo usano ora (il "+" di Impegni, un giorno cliccato
 * nel widget Calendario) e ognuno sa meglio di questa funzione COSA
 * rileggere dopo (gli impegni di oggi, o il mese in vista) — tramite
 * refreshAgenda()/fetchMonthEvents() qui sotto, chiamate dal chiamante
 * stesso su successo. Stesso principio di src/lib/actions/spotify.ts
 * (stato fresco ritornato al client invece di affidarsi al refresh
 * automatico di Next dopo una Server Action, fonte di bug flaky già
 * visti in questa sessione) — solo spostato su chi consuma il risultato.
 */
export async function createCalendarEvent(
  input: CreateEventInput,
): Promise<CreateCalendarEventResult> {
  const created = await createEvent(input)
  if (!created.ok) return created
  return { ok: true }
}

/** Sola lettura esposta come Server Action perché serve a un Client
 * Component (AgendaLive, per il polling) — stesso schema di
 * fetchBoardLayouts() in actions/board.ts. */
export async function refreshAgenda(): Promise<CalendarResult> {
  return getTodayEvents()
}

/** Sola lettura esposta per CalendarWidget (widgets/calendar-widget.tsx) —
 * stesso schema di refreshAgenda sopra. */
export async function fetchMonthEvents(monthCursorKey: string): Promise<CalendarResult> {
  return getMonthEvents(monthCursorKey)
}
