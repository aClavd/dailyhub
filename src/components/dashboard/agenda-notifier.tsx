"use client"

import { useEffect } from "react"

import { URGENT_MIN } from "@/lib/agenda-signal"
import { traQuanto } from "@/lib/datetime"
import type { CalendarEvent } from "@/lib/google/calendar"
import { useLocalStorage } from "@/lib/use-local-storage"

import { useToast } from "./toast-context"

// Stessa soglia già decisa in Fase 5.2 per la spina rossa di Impegni
// (lib/agenda-signal.ts) — un solo concetto di "imminente" in tutta l'app,
// importato invece di un secondo numero ridigitato qui.
const NOTIFY_MIN = URGENT_MIN
const CHECK_EVERY_MS = 30_000

/**
 * Avviso quando un impegno sta per iniziare — al posto del banner "Oggi
 * conta questo" (tolto: un campo scritto a mano che probabilmente restava
 * vuoto, zero valore automatico). Monta dentro AgendaSection in page.tsx,
 * riusando gli eventi già scaricati lì — nessuna seconda chiamata a
 * Google Calendar. Nessuna UI propria: l'avviso vero e proprio vive nello
 * stack condiviso (toast-context.tsx), qui c'è solo il controllo.
 */
export function AgendaNotifier({
  events,
  todayKey,
}: {
  events: CalendarEvent[]
  todayKey: string
}) {
  const [, setNotified] = useLocalStorage<string[]>(`dailyhub:notified-events:${todayKey}`, [])
  const pushToast = useToast()

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
        // effect due volte di fila (Strict Mode, solo in sviluppo).
        setNotified((prev) => {
          if (prev.includes(event.id)) return prev
          pushToast({
            id: `event-${event.id}`,
            title: event.title,
            label: traQuanto(start, now),
            accent: "urgente",
          })
          return [...prev, event.id]
        })
      }
    }

    check()
    const id = window.setInterval(check, CHECK_EVERY_MS)
    return () => window.clearInterval(id)
    // setNotified/pushToast intenzionalmente fuori: store/contesto stabili,
    // non serve ricrearli tra le dipendenze.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events])

  return null
}
