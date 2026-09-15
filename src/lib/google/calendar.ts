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

export type CreateEventInput = {
  title: string
  /** "YYYY-MM-DDTHH:mm:00", senza offset — è l'ora così come l'ha scritta
   * chi compila il form. Google la interpreta lui usando `timeZone`, niente
   * conversione a Date qui: il server che esegue questa funzione potrebbe
   * girare in un fuso diverso da quello di chi ha aperto il form. */
  startLocal: string
  endLocal: string
  timeZone: string
  location?: string
}

export type CreateEventResult =
  | { ok: true; event: CalendarEvent }
  | { ok: false; reason: "unauthenticated" | "token" | "api"; detail?: string }

/** Crea un evento sul calendario primario. Stessa convenzione di errori di
 * getTodayEvents() sopra — riusa `normalize()`: la risposta di Google a una
 * creazione ha la stessa forma di un evento in lista. */
export async function createEvent(input: CreateEventInput): Promise<CreateEventResult> {
  const session = await auth()
  if (!session?.user) return { ok: false, reason: "unauthenticated" }
  if (session.error || !session.accessToken) {
    return { ok: false, reason: "token", detail: session.error }
  }

  let res: Response
  try {
    res = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: input.title,
          location: input.location || undefined,
          start: { dateTime: input.startLocal, timeZone: input.timeZone },
          end: { dateTime: input.endLocal, timeZone: input.timeZone },
        }),
      },
    )
  } catch (err) {
    return { ok: false, reason: "api", detail: String(err) }
  }

  // 401 (token scaduto) e 403 (permesso mancante — il caso di chi non si è
  // ancora riconnesso dopo il passaggio a calendar.events) portano entrambi
  // a "token": in agenda-card.tsx quel reason mostra "Riconnetti Google",
  // che risolve entrambi i casi allo stesso modo (un nuovo login).
  if (res.status === 401 || res.status === 403) return { ok: false, reason: "token" }
  if (!res.ok) return { ok: false, reason: "api", detail: `HTTP ${res.status}` }

  const raw = (await res.json()) as GoogleEvent
  return { ok: true, event: normalize(raw) }
}
