import "server-only"

import { auth } from "@/auth"
import { fineGiornata, inizioGiornata } from "@/lib/datetime"

export type CalendarEvent = {
  id: string
  title: string
  /** ISO datetime per gli eventi con orario; `null` se è un evento "tutto il giorno". */
  start: string | null
  end: string | null
  allDay: boolean
  location: string | null
  meetUrl: string | null
  htmlLink: string | null
}

export type CalendarResult =
  | { ok: true; events: CalendarEvent[] }
  | { ok: false; reason: "unauthenticated" | "token" | "api"; detail?: string }

type GoogleDateTime = { date?: string; dateTime?: string; timeZone?: string }

type GoogleEvent = {
  id: string
  status?: string
  summary?: string
  location?: string
  htmlLink?: string
  hangoutLink?: string
  start?: GoogleDateTime
  end?: GoogleDateTime
  conferenceData?: {
    entryPoints?: { entryPointType?: string; uri?: string }[]
  }
}

function meetUrlOf(e: GoogleEvent): string | null {
  if (e.hangoutLink) return e.hangoutLink
  const video = e.conferenceData?.entryPoints?.find(
    (p) => p.entryPointType === "video" && p.uri,
  )
  return video?.uri ?? null
}

function normalize(e: GoogleEvent): CalendarEvent {
  const allDay = Boolean(e.start?.date && !e.start?.dateTime)
  return {
    id: e.id,
    title: e.summary?.trim() || "(senza titolo)",
    start: e.start?.dateTime ?? null,
    end: e.end?.dateTime ?? null,
    allDay,
    location: e.location?.trim() || null,
    meetUrl: meetUrlOf(e),
    htmlLink: e.htmlLink ?? null,
  }
}

/** Eventi del calendario primario per la giornata corrente. */
export async function getTodayEvents(): Promise<CalendarResult> {
  const session = await auth()
  if (!session?.user) return { ok: false, reason: "unauthenticated" }
  if (session.error || !session.accessToken) {
    return { ok: false, reason: "token", detail: session.error }
  }

  const url = new URL(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
  )
  url.searchParams.set("timeMin", inizioGiornata().toISOString())
  url.searchParams.set("timeMax", fineGiornata().toISOString())
  url.searchParams.set("singleEvents", "true")
  url.searchParams.set("orderBy", "startTime")
  url.searchParams.set("maxResults", "50")

  let res: Response
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      cache: "no-store",
    })
  } catch (err) {
    return { ok: false, reason: "api", detail: String(err) }
  }

  if (res.status === 401) return { ok: false, reason: "token" }
  if (!res.ok) return { ok: false, reason: "api", detail: `HTTP ${res.status}` }

  const data = (await res.json()) as { items?: GoogleEvent[] }
  const events = (data.items ?? [])
    .filter((e) => e.status !== "cancelled")
    .map(normalize)

  return { ok: true, events }
}
