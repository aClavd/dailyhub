"use client"

import { useEffect, useState } from "react"

import { refreshAgenda } from "@/lib/actions/calendar"
import { refreshMail } from "@/lib/actions/mail"
import { computeAttentionSignals, type AttentionSignals } from "@/lib/attention-signals"
import { greeting } from "@/lib/datetime"
import type { CalendarResult } from "@/lib/google/calendar"
import type { MailResult } from "@/lib/mail"
import type { MailFilterSummary } from "@/lib/queries/mail-filters"
import { usePolling } from "@/lib/use-polling"

import { CHECK_EVERY_MS as DIARIO_CHECK_MS, REMINDER_HOUR } from "@/components/dashboard/diario-reminder"

// Stesso intervallo già usato da Impegni/Mail (agenda-card.tsx/mail-card.tsx).
const REFRESH_MS = 90_000

export type LiveAttention = AttentionSignals & {
  events: CalendarResult
  mail: MailResult
  /** null finché l'effect di mount non gira una volta (dipende dall'ora di
   * chi guarda, mai calcolato durante il render — evita un mismatch di
   * idratazione, stesso motivo/stessa tecnica di sempre in questo file). */
  greetingWord: string | null
}

/**
 * Mobile Attention v1 — estratta da right-panel.tsx (che la usava solo per
 * sé): eventi/mail live (stesso polling, stesse Server Action) + i segnali
 * di Attention (computeAttentionSignals, lib/attention-signals.ts) + il
 * saluto del Daily Brief. Due chiamanti oggi (RightPanel per desktop,
 * TopBar per mobile/tablet — mai montati insieme, `lg:` è sempre l'uno o
 * l'altro): un'unica implementazione, non due copie che potrebbero
 * disallinearsi — esattamente il motivo per cui questo file esiste.
 */
export function useLiveAttention({
  initialEvents,
  initialMail,
  filters,
  diarioWritten,
}: {
  initialEvents: CalendarResult
  initialMail: MailResult
  filters: readonly MailFilterSummary[]
  diarioWritten: boolean
}): LiveAttention {
  const [events, setEvents] = useState(initialEvents)
  const [mail, setMail] = useState(initialMail)

  usePolling(() => {
    void refreshAgenda().then(setEvents)
  }, REFRESH_MS)
  usePolling(() => {
    void refreshMail().then(setMail)
  }, REFRESH_MS)

  // Promemoria diario: stessa soglia/cadenza di diario-reminder.tsx, ma
  // calcolata SOLO dentro un effect (mai durante il render) — l'ora del
  // server che ha disegnato la pagina e quella di chi la guarda possono
  // differire.
  const [afterReminderHour, setAfterReminderHour] = useState(false)
  useEffect(() => {
    const check = () => setAfterReminderHour(new Date().getHours() >= REMINDER_HOUR)
    check()
    const id = window.setInterval(check, DIARIO_CHECK_MS)
    return () => window.clearInterval(id)
  }, [])

  const [greetingWord, setGreetingWord] = useState<string | null>(null)
  useEffect(() => {
    const set = () => setGreetingWord(greeting())
    set()
  }, [])

  const signals = computeAttentionSignals({
    events: events.ok ? events.events : [],
    mail: mail.messages,
    filters,
    diarioWritten,
    afterReminderHour,
  })

  return { ...signals, events, mail, greetingWord }
}
