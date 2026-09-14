"use client"

import { useEffect, useState } from "react"

import { traQuanto } from "@/lib/datetime"
import type { CalendarEvent } from "@/lib/google/calendar"
import { useLocalStorage } from "@/lib/use-local-storage"

// Stessa soglia già decisa in Fase 5.2 per la spina rossa di Impegni
// (agenda-card.tsx, URGENT_MIN) — un solo concetto di "imminente" in
// tutta l'app, non un secondo numero inventato qui.
const NOTIFY_MIN = 20
const CHECK_EVERY_MS = 30_000
const AUTO_DISMISS_MS = 20_000

type Toast = { id: string; title: string; label: string }

/**
 * Avviso quando un impegno sta per iniziare — al posto del banner "Oggi
 * conta questo" (tolto: un campo scritto a mano che probabilmente restava
 * vuoto, zero valore automatico). Monta dentro AgendaSection in page.tsx,
 * riusando gli eventi già scaricati lì — nessuna seconda chiamata a
 * Google Calendar.
 */
export function AgendaNotifier({
  events,
  todayKey,
}: {
  events: CalendarEvent[]
  todayKey: string
}) {
  const [, setNotified] = useLocalStorage<string[]>(`dailyhub:notified-events:${todayKey}`, [])
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const timed = events.filter((e) => !e.allDay && e.start)

    function check() {
      const now = new Date()
      for (const event of timed) {
        const start = new Date(event.start as string)
        const minutes = Math.round((start.getTime() - now.getTime()) / 60_000)
        if (minutes < 0 || minutes > NOTIFY_MIN) continue

        // "Controlla e segna" in un solo passaggio sullo store di
        // useLocalStorage: il suo `set` legge lo stato vero al momento
        // della chiamata (non una closure di React potenzialmente
        // superata), quindi resta corretto anche se React invoca questo
        // effect due volte di fila (Strict Mode, solo in sviluppo) — visto
        // per davvero: con un ref aggiornato "a mano" i due giri vedevano
        // entrambi lo stato iniziale e mostravano l'avviso due volte.
        setNotified((prev) => {
          if (prev.includes(event.id)) return prev
          setToasts((t) => [...t, { id: event.id, title: event.title, label: traQuanto(start, now) }])
          window.setTimeout(() => {
            setToasts((t) => t.filter((x) => x.id !== event.id))
          }, AUTO_DISMISS_MS)
          return [...prev, event.id]
        })
      }
    }

    check()
    const id = window.setInterval(check, CHECK_EVERY_MS)
    return () => window.clearInterval(id)
    // setNotified intenzionalmente fuori: è lo stesso store condiviso di
    // useLocalStorage, stabile per chiave — non serve nelle dipendenze.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events])

  if (toasts.length === 0) return null

  return (
    <div className="fixed right-4 bottom-4 z-40 flex w-72 flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="bg-card border-border flex items-start gap-2.5 rounded-xl border p-3 shadow-lg"
        >
          <span className="bg-destructive mt-1.5 size-1.5 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{t.title}</p>
            <p className="text-ink-faint mt-0.5 text-xs">{t.label}</p>
          </div>
          <button
            type="button"
            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            aria-label="Chiudi avviso"
            className="text-ink-faint hover:text-foreground shrink-0 text-sm leading-none"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  )
}
