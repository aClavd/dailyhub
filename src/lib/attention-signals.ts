import type { WidgetEmphasis } from "@/components/board/widget-shell"
import { agendaEmphasis, nextOrRunningEvent } from "@/lib/agenda-signal"
import { traQuanto } from "@/lib/datetime"
import type { CalendarEvent } from "@/lib/google/calendar"
import type { MailMessage } from "@/lib/mail"
import { matchingFilter } from "@/lib/mail-filter-match"
import type { MailFilterSummary } from "@/lib/queries/mail-filters"

/**
 * Estratto da right-panel.tsx (Morning Briefing v1) — prima questo calcolo
 * viveva solo lì, inline. Daily Brief/Attention Rail (right-panel.tsx) e
 * Morning Briefing (morning-briefing.tsx) raccontano entrambi "cosa merita
 * attenzione oggi": un solo posto che decide, due presentazioni diverse
 * (righe interattive nel pannello, righe di sola lettura nel briefing) —
 * non due calcoli che potrebbero disallinearsi (Morning Briefing
 * Architecture Audit v1, sez. D).
 *
 * Nessun "server-only" qui (come agenda-signal.ts/mail-filter-match.ts, da
 * cui questo file dipende): deve poter girare anche lato client, right-
 * panel.tsx lo chiama in un Client Component.
 */
export type AttentionSignals = {
  showEvent: boolean
  eventSignal: { event: CalendarEvent; running: boolean } | null
  eventLevel: WidgetEmphasis
  eventTimeLabel: string
  /** Mail che combaciano con una regola di importanza (mail-filter-dialog.tsx). */
  importantMail: MailMessage[]
  /** Sottoinsieme di importantMail ancora non lette (solo Gmail lo sa davvero). */
  unreadImportantMail: MailMessage[]
  showDiarioReminder: boolean
  attentionCount: number
}

export function computeAttentionSignals({
  events,
  mail,
  filters,
  diarioWritten,
  afterReminderHour,
}: {
  events: CalendarEvent[]
  mail: MailMessage[]
  filters: readonly MailFilterSummary[]
  diarioWritten: boolean
  afterReminderHour: boolean
}): AttentionSignals {
  const eventSignal = nextOrRunningEvent(events)
  const eventLevel = agendaEmphasis(events).level
  const showEvent = Boolean(eventSignal) && eventLevel !== "none"
  const eventTimeLabel = eventSignal
    ? eventSignal.running
      ? "in corso"
      : traQuanto(new Date(eventSignal.event.start as string), new Date())
    : ""

  const importantMail = mail.filter((m) => matchingFilter(m, filters))
  const unreadImportantMail = importantMail.filter((m) => m.unread)
  const showDiarioReminder = afterReminderHour && !diarioWritten
  const attentionCount = (showEvent ? 1 : 0) + importantMail.length + (showDiarioReminder ? 1 : 0)

  return {
    showEvent,
    eventSignal,
    eventLevel,
    eventTimeLabel,
    importantMail,
    unreadImportantMail,
    showDiarioReminder,
    attentionCount,
  }
}

/** Le frasi del Daily Brief — stesso identico testo di prima, solo spostato
 * qui perché ora ha un secondo chiamante (morning-briefing.ts). */
export function buildBriefSentences(signals: AttentionSignals): string[] {
  const { unreadImportantMail, importantMail, showDiarioReminder, showEvent } = signals
  const sentences: string[] = []
  if (unreadImportantMail.length > 0) {
    sentences.push(
      `Hai ${unreadImportantMail.length} ${unreadImportantMail.length === 1 ? "mail non letta" : "mail non lette"} da gestire.`,
    )
  } else if (importantMail.length > 0) {
    sentences.push(
      `Hai ${importantMail.length} ${importantMail.length === 1 ? "mail importante" : "mail importanti"} da gestire.`,
    )
  }
  if (showDiarioReminder) sentences.push("Diario ancora da scrivere.")
  if (!showEvent) sentences.push("Nessun impegno imminente.")
  return sentences
}
