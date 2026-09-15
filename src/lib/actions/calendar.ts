"use server"

import {
  createEvent,
  getTodayEvents,
  type CalendarResult,
  type CreateEventInput,
} from "@/lib/google/calendar"

export type CreateCalendarEventResult =
  | { ok: true; today: CalendarResult }
  | { ok: false; reason: "unauthenticated" | "token" | "api"; detail?: string }

/**
 * Crea l'evento su Google Calendar, poi rilegge subito gli impegni di oggi
 * e li ritorna — stesso principio già usato in src/lib/actions/spotify.ts
 * (runPlayerCommand): il chiamante (client) applica questo stato fresco
 * direttamente, invece di affidarsi al refresh automatico di Next dopo una
 * Server Action (fonte di bug flaky già visti in questa sessione).
 */
export async function createCalendarEvent(
  input: CreateEventInput,
): Promise<CreateCalendarEventResult> {
  const created = await createEvent(input)
  if (!created.ok) return created
  const today = await getTodayEvents()
  return { ok: true, today }
}

/** Sola lettura esposta come Server Action perché serve a un Client
 * Component (AgendaLive, per il polling) — stesso schema di
 * fetchBoardLayouts() in actions/board.ts. */
export async function refreshAgenda(): Promise<CalendarResult> {
  return getTodayEvents()
}
