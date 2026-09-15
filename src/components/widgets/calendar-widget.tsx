"use client"

import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { reconnectGoogle } from "@/lib/actions/auth"
import { fetchMonthEvents } from "@/lib/actions/calendar"
import { addMonths, chiaveGiorno, meseAnno, monthGrid, parseChiave } from "@/lib/datetime"
import type { CalendarEvent, CalendarResult } from "@/lib/google/calendar"
import { cn } from "@/lib/utils"

import { NewEventForm } from "@/components/dashboard/new-event-form"

const GIORNI_BREVI = ["L", "M", "M", "G", "V", "S", "D"]

/** Giorno (chiave "YYYY-MM-DD") in cui ricade un evento con orario — solo
 * quelli: un evento "tutto il giorno" non ha `start` (vedi CalendarEvent,
 * normalize() in google/calendar.ts), fuori scope per v1 — un pallino sul
 * giorno giusto per gli eventi con orario copre già il caso comune. */
function dayKeyOf(event: CalendarEvent): string | null {
  return event.start ? chiaveGiorno(new Date(event.start)) : null
}

/**
 * Vista mese di Google Calendar dentro un blocco della board — riusa la
 * stessa griglia/navigazione già costruita per la Cronologia estesa
 * (history-explorer.tsx: monthGrid/addMonths/meseAnno, lib/datetime.ts),
 * applicata a impegni veri invece che a voci di diario. Si autoalimenta
 * (niente slot da page.tsx come Impegni/Mail): non deve girare in
 * sottofondo quando non è sulla board, nessun avviso agganciato a questo
 * blocco — solo la vista, e poter aggiungere un impegno per un giorno.
 */
export function CalendarWidget() {
  // chiaveGiorno() chiamata qui, non in un inizializzatore pigro di
  // useState — stesso schema già in acqua-widget.tsx: un valore, non una
  // funzione, nessun problema di purezza.
  const todayKey = chiaveGiorno()
  const [cursor, setCursor] = useState(parseChiave(todayKey))
  const [result, setResult] = useState<CalendarResult | null>(null)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  // Niente reset a "sto caricando" al cambio mese: tiene il mese
  // precedente a schermo finché non arriva quello nuovo, invece di uno
  // sfarfallio — coerente con setState non andrebbe chiamato in modo
  // sincrono dentro un effect (react-hooks/set-state-in-effect).
  const cursorKey = chiaveGiorno(cursor)
  useEffect(() => {
    let cancelled = false
    void fetchMonthEvents(cursorKey).then((r) => {
      if (!cancelled) setResult(r)
    })
    return () => {
      cancelled = true
    }
  }, [cursorKey])

  const eventsByDay = useMemo(() => {
    const map: Record<string, number> = {}
    if (result?.ok) {
      for (const e of result.events) {
        const key = dayKeyOf(e)
        if (key) map[key] = (map[key] ?? 0) + 1
      }
    }
    return map
  }, [result])

  function refresh() {
    void fetchMonthEvents(cursorKey).then(setResult)
  }

  const days = monthGrid(cursor)
  const currentMonth = cursor.getMonth()

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCursor((c) => addMonths(c, -1))}
            aria-label="Mese precedente"
            className="text-ink-soft hover:text-foreground grid size-5 place-items-center rounded text-xs"
          >
            ‹
          </button>
          <span className="w-24 text-center text-xs font-medium capitalize">{meseAnno(cursor)}</span>
          <button
            type="button"
            onClick={() => setCursor((c) => addMonths(c, 1))}
            aria-label="Mese successivo"
            className="text-ink-soft hover:text-foreground grid size-5 place-items-center rounded text-xs"
          >
            ›
          </button>
        </div>
        <button
          type="button"
          onClick={() => setCursor(parseChiave(todayKey))}
          className="text-ink-faint hover:text-foreground text-[0.65rem] font-medium uppercase"
        >
          Oggi
        </button>
      </div>

      {result && !result.ok ? (
        <CalendarError reason={result.reason} />
      ) : (
        <>
          <div className="text-ink-faint mb-1 grid grid-cols-7 gap-0.5 text-center text-[0.58rem] uppercase">
            {/* Indice come key: L/M/M/G/V/S/D non sono univoci come testo
                (martedì e mercoledì iniziano entrambi per M). */}
            {GIORNI_BREVI.map((g, i) => (
              <div key={i}>{g}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {days.map((d) => {
              const key = chiaveGiorno(d)
              const inMonth = d.getMonth() === currentMonth
              const isToday = key === todayKey
              const count = eventsByDay[key] ?? 0
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDay(key)}
                  className={cn(
                    "hover:bg-muted flex flex-col items-center gap-0.5 rounded-md py-1 text-[0.68rem] transition-colors",
                    !inMonth && "text-ink-faint opacity-40",
                    isToday && "bg-brand-soft text-primary font-semibold",
                  )}
                >
                  <span>{d.getDate()}</span>
                  {/* bg-primary sempre (non condizionato a isToday) e
                      size-1.5 come il pallino umore della Cronologia —
                      con bg-ink-faint (pensato per testo attenuato, non
                      per un indicatore) a size-1 (4px) il puntino c'era
                      ma era praticamente invisibile: bug reale, trovato
                      da Claudio (nessun impegno visibile su nessun
                      giorno pur avendone uno registrato). */}
                  <span
                    className={cn("size-1.5 rounded-full", count > 0 ? "bg-primary" : "bg-transparent")}
                  />
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* Nessun trigger visibile: la cella del giorno stessa apre il
          modulo, precompilato per quel giorno (NewEventForm, initialDate). */}
      <Dialog open={selectedDay !== null} onOpenChange={(next) => !next && setSelectedDay(null)}>
        <NewEventForm
          open={selectedDay !== null}
          initialDate={selectedDay ? parseChiave(selectedDay) : undefined}
          onCreated={refresh}
          onClose={() => setSelectedDay(null)}
        />
      </Dialog>
    </div>
  )
}

function CalendarError({ reason }: { reason: "unauthenticated" | "token" | "api" }) {
  if (reason === "api") {
    return (
      <p className="text-ink-soft py-6 text-center text-sm">
        Non riesco a leggere il calendario adesso. Riprova tra poco.
      </p>
    )
  }
  return (
    <div className="py-5 text-center">
      <p className="text-ink-soft text-sm">La sessione con Google è scaduta.</p>
      <form action={reconnectGoogle}>
        <Button type="submit" variant="outline" size="sm" className="mt-3">
          Riconnetti Google
        </Button>
      </form>
    </div>
  )
}
