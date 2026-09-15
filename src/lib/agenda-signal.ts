import type { WidgetEmphasis } from "@/components/board/widget-shell"
import { traQuanto } from "@/lib/datetime"
import type { CalendarEvent } from "@/lib/google/calendar"

// Soglie della Fase 5.2 — "urgente" è la soglia che Claudio stesso ha
// usato come esempio (un appuntamento tra 20 minuti); "attenzione" è
// un'ora, un preavviso più morbido. Un solo posto per questi due numeri:
// prima vivevano solo dentro agenda-card.tsx e agenda-notifier.tsx li
// replicava in un commento ("stessa soglia già decisa...") invece di
// importarli — qui diventano la fonte vera, non solo la spiegazione.
export const URGENT_MIN = 20
export const ATTENTION_MIN = 60

/** Stesso calcolo di "prossimo evento"/"in corso" già usato per evidenziare
 * la riga in AgendaList — decide anche il livello da segnalare alla
 * WidgetShell (widget-shell.tsx). Spostato qui (fuori da agenda-card.tsx,
 * un Client Component) perché serve anche al pannello destro (Daily
 * Brief/Attention Center, right-panel-live.tsx): un solo calcolo di "quanto
 * manca al prossimo impegno" in tutta l'app, non due copie che potrebbero
 * disallinearsi. Nessun "server-only" qui (a differenza di
 * lib/google/calendar.ts, da cui viene solo il TIPO CalendarEvent, erasi a
 * compile-time): questo file deve poter girare anche lato client.
 */
export function agendaEmphasis(events: CalendarEvent[]): { level: WidgetEmphasis; label?: string } {
  const now = new Date()
  const timed = events.filter((e) => !e.allDay && e.start)

  const running = timed.find((e) => {
    const start = new Date(e.start as string)
    const end = e.end ? new Date(e.end) : null
    return start <= now && !!end && end > now
  })
  if (running) return { level: "urgente", label: "in corso" }

  const next = timed.find((e) => new Date(e.start as string) > now)
  if (!next) return { level: "none" }
  const start = new Date(next.start as string)
  const minutes = Math.round((start.getTime() - now.getTime()) / 60_000)
  if (minutes <= URGENT_MIN) return { level: "urgente", label: traQuanto(start, now) }
  if (minutes <= ATTENTION_MIN) return { level: "attenzione", label: traQuanto(start, now) }
  return { level: "none" }
}

/** Il prossimo evento con orario ancora da iniziare (o quello in corso
 * adesso) — usato dal Daily Brief per la riga "prossimo impegno", stessa
 * lista filtrata di agendaEmphasis sopra ma con l'evento stesso in mano,
 * non solo il livello/etichetta. */
export function nextOrRunningEvent(events: CalendarEvent[]): {
  event: CalendarEvent
  running: boolean
} | null {
  const now = new Date()
  const timed = events.filter((e) => !e.allDay && e.start)

  const running = timed.find((e) => {
    const start = new Date(e.start as string)
    const end = e.end ? new Date(e.end) : null
    return start <= now && !!end && end > now
  })
  if (running) return { event: running, running: true }

  const next = timed.find((e) => new Date(e.start as string) > now)
  return next ? { event: next, running: false } : null
}
