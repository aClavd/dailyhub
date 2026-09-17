import { computeAttentionSignals } from "@/lib/attention-signals"
import { dataEstesa, greeting, inizioGiornata, oraBreve } from "@/lib/datetime"
import type { DiarioState } from "@/lib/diario"
import type { CalendarResult } from "@/lib/google/calendar"
import type { MailResult } from "@/lib/mail"
import type { MailFilterSummary } from "@/lib/queries/mail-filters"

/**
 * Orchestrazione del Morning Briefing (v1) — Morning Briefing Architecture
 * Audit v1, sez. E/H: nessun dato nuovo, nessuna fetch nuova. Compone dati
 * già letti da page.tsx (eventsInitial/mailInitial, gli stessi passati a
 * RightPanel) con lib/attention-signals.ts, la STESSA fonte di verità del
 * Daily Brief — "una sola logica, più presentazioni".
 *
 * Pura: nessun accesso a localStorage/DOM qui dentro (quello vive nel
 * componente client che chiama questa funzione, morning-briefing.tsx) —
 * `now` è un parametro, non `new Date()` letta internamente, per restare
 * testabile e per lasciare al chiamante la stessa disciplina già in uso
 * altrove (right-panel.tsx calcola afterReminderHour solo in un effect,
 * mai durante il render, per lo stesso motivo di mismatch server/client).
 */

const OVERNIGHT_MAX_ROWS = 3
const TODAY_MAX_ROWS = 5

export type MorningBriefingMailRow = {
  key: string
  from: string
  subject: string
  time: string | null
  unread: boolean
  link: string | null
}

export type MorningBriefingAttentionRow = {
  key: string
  label: string
  detail: string
}

export type MorningBriefingEventRow = {
  key: string
  time: string
  title: string
}

export type MorningBriefingData = {
  greetingWord: string
  dateLabel: string
  /** Mail importanti arrivate da mezzanotte in poi (taglio onesto — nessuna
   * nozione di "ultima apertura", vedi l'audit sez. C). */
  overnightMail: {
    count: number
    rows: MorningBriefingMailRow[]
    overflow: number
  }
  /** Solo impegno urgente/imminente + promemoria diario — le mail importanti
   * sono già raccontate per intero sopra (overnightMail): ripeterle anche
   * qui sarebbe la stessa duplicazione che l'audit segnala tra sezioni
   * diverse, solo dentro la stessa schermata invece che tra due schermate. */
  attention: {
    hasItem: boolean
    rows: MorningBriefingAttentionRow[]
  }
  today: {
    rows: MorningBriefingEventRow[]
    allDayCount: number
    overflow: number
  }
  /** Nessuna mail stanotte, nessuna attenzione, nessun impegno imminente —
   * il briefing può restare molto corto (UX RULE del prompt). */
  isQuiet: boolean
}

export function buildMorningBriefing({
  events,
  mail,
  filters,
  diario,
  afterReminderHour,
  now,
}: {
  events: CalendarResult
  mail: MailResult
  filters: readonly MailFilterSummary[]
  diario: DiarioState
  afterReminderHour: boolean
  now: Date
}): MorningBriefingData {
  const diarioWritten = Boolean(diario.testo.trim())
  const eventList = events.ok ? events.events : []
  const signals = computeAttentionSignals({
    events: eventList,
    mail: mail.messages,
    filters,
    diarioWritten,
    afterReminderHour,
  })

  const midnight = inizioGiornata(now)
  const overnightImportant = signals.importantMail.filter((m) => m.date && new Date(m.date) >= midnight)
  const overnightMail = {
    count: overnightImportant.length,
    rows: overnightImportant.slice(0, OVERNIGHT_MAX_ROWS).map((m) => ({
      key: `mail-${m.provider}-${m.id}`,
      from: m.from,
      subject: m.subject.trim() || "(senza oggetto)",
      time: m.date ? oraBreve(m.date) : null,
      unread: m.unread,
      link: m.link,
    })),
    overflow: Math.max(0, overnightImportant.length - OVERNIGHT_MAX_ROWS),
  }

  const attentionRows: MorningBriefingAttentionRow[] = []
  if (signals.showEvent && signals.eventSignal) {
    attentionRows.push({
      key: `event-${signals.eventSignal.event.id}`,
      label: signals.eventSignal.event.title,
      detail: signals.eventTimeLabel,
    })
  }
  if (signals.showDiarioReminder) {
    attentionRows.push({ key: "diario-reminder", label: "Diario di oggi", detail: "da scrivere" })
  }

  const timed = eventList.filter((e) => !e.allDay && e.start)
  const allDayCount = eventList.filter((e) => e.allDay).length
  const today = {
    rows: timed.slice(0, TODAY_MAX_ROWS).map((e) => ({
      key: e.id,
      time: e.start ? oraBreve(e.start) : "",
      title: e.title,
    })),
    allDayCount,
    overflow: Math.max(0, timed.length - TODAY_MAX_ROWS),
  }

  return {
    greetingWord: greeting(now),
    dateLabel: dataEstesa(now),
    overnightMail,
    attention: { hasItem: attentionRows.length > 0, rows: attentionRows },
    today,
    isQuiet: overnightMail.count === 0 && attentionRows.length === 0 && today.rows.length === 0 && allDayCount === 0,
  }
}
