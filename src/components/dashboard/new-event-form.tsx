"use client"

import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { DialogClose, DialogPopup, DialogTitle } from "@/components/ui/dialog"
import { createCalendarEvent } from "@/lib/actions/calendar"
import { reconnectGoogle } from "@/lib/actions/auth"
import { datetimeLocalValue } from "@/lib/datetime"

const FIELD =
  "bg-muted border-border focus:outline-primary w-full rounded-md border px-2.5 py-1.5 text-sm focus:outline-2"

/** Prossima mezz'ora tonda — un default sensato invece di partire da "ora"
 * spaccata al minuto. Usato solo quando non è stato passato `initialDate`
 * (il "+" di Impegni: nessun giorno specifico in mente). */
function defaultStart(): Date {
  const d = new Date()
  d.setSeconds(0, 0)
  d.setMinutes(d.getMinutes() <= 30 ? 30 : 60)
  return d
}

/** 09:00 sul giorno indicato — un default ragionevole quando si è scelto
 * un giorno (dal widget Calendario) ma non un orario: "adesso" non
 * avrebbe senso attaccato a una data futura. */
function atNineAm(date: Date): Date {
  const d = new Date(date)
  d.setHours(9, 0, 0, 0)
  return d
}

function initialFields(initialDate?: Date) {
  const start = initialDate ? atNineAm(initialDate) : defaultStart()
  const end = new Date(start.getTime() + 60 * 60_000)
  return { title: "", start: datetimeLocalValue(start), end: datetimeLocalValue(end), location: "" }
}

/**
 * Contenuto del modulo "nuovo impegno" — solo `<DialogPopup>`, non
 * possiede `<Dialog>`/trigger propri: stesso schema di layout-manager.tsx
 * e mail-filter-dialog.tsx, chi lo usa possiede l'apertura/chiusura. Due
 * punti d'ingresso oggi: il "+" di Impegni (agenda-card.tsx, nessun
 * `initialDate` — parte da "adesso") e un giorno cliccato nel widget
 * Calendario (calendar-widget.tsx, `initialDate` = quel giorno alle 9).
 *
 * `open` serve SOLO per sapere quando resettare i campi (si riapre pulito
 * ogni volta) — non per montare/smontare il componente: un `key` diverso
 * a ogni apertura sembrava la via più semplice ma smontava anche
 * `<DialogPopup>` (è il nodo radice qui sotto), rompendo l'animazione di
 * chiusura di Base UI a metà (bug reale, trovato provando dal vivo: il
 * fondo scuro restava bloccato e intercettava i click). Il reset avviene
 * "aggiustando lo stato durante il render" (pattern consigliato da React
 * per "resetta quando cambia una prop", vedi react.dev) invece che in un
 * effect: un effect che chiama setState nel corpo è comunque sconsigliato
 * (regola react-hooks/set-state-in-effect di questo progetto).
 * `initialDate?.getTime()` sotto, non l'oggetto Date: chi chiama lo
 * ricrea a ogni suo render, un Date diverso ogni volta resetterebbe il
 * modulo anche mentre si sta scrivendo dentro.
 *
 * `onCreated` non porta dati: la creazione riesce e basta, è chi chiama
 * a sapere cosa rileggere dopo (gli impegni di oggi per AgendaBody, il
 * mese in vista per CalendarWidget) — createCalendarEvent() non rilegge
 * più nulla da sé, vedi il commento lì.
 */
export function NewEventForm({
  open,
  initialDate,
  onCreated,
  onClose,
}: {
  open: boolean
  initialDate?: Date
  onCreated: () => void
  onClose: () => void
}) {
  const [fields, setFields] = useState(() => initialFields(initialDate))
  const [error, setError] = useState<{ reason: "token" | "api"; detail?: string } | null>(null)
  const [pending, startTransition] = useTransition()

  const [prevOpenState, setPrevOpenState] = useState({ open, dateMs: initialDate?.getTime() })
  if (open !== prevOpenState.open || initialDate?.getTime() !== prevOpenState.dateMs) {
    setPrevOpenState({ open, dateMs: initialDate?.getTime() })
    if (open) {
      setFields(initialFields(initialDate))
      setError(null)
    }
  }

  function submit() {
    const title = fields.title.trim()
    if (!title) return
    // Confronto diretto sulle stringhe "YYYY-MM-DDTHH:mm": a larghezza fissa
    // e zero-padded, l'ordine lessicografico coincide con quello cronologico
    // — non serve passare per Date solo per questo controllo.
    if (fields.end <= fields.start) {
      setError({ reason: "api", detail: "end-before-start" })
      return
    }
    setError(null)
    startTransition(async () => {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
      const result = await createCalendarEvent({
        title,
        startLocal: `${fields.start}:00`,
        endLocal: `${fields.end}:00`,
        timeZone,
        location: fields.location.trim() || undefined,
      })
      if (!result.ok) {
        // "unauthenticated" non dovrebbe capitare (la dashboard richiede già
        // una sessione), ma va trattato come "token": stesso rimedio
        // (riconnettersi), stessa UI di AgendaError in agenda-card.tsx.
        setError({
          reason: result.reason === "api" ? "api" : "token",
          detail: result.detail,
        })
        return
      }
      onCreated()
      onClose()
    })
  }

  return (
    <DialogPopup className="max-w-md">
      <div className="border-border flex shrink-0 items-center justify-between border-b px-5 py-3.5">
        <DialogTitle>Nuovo impegno</DialogTitle>
        <DialogClose
          aria-label="Chiudi"
          className="relative text-ink-faint hover:bg-muted hover:text-foreground grid size-7 shrink-0 place-items-center rounded-md text-base leading-none after:absolute after:-inset-2 after:content-['']"
        >
          &times;
        </DialogClose>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
        <input
          autoFocus
          value={fields.title}
          onChange={(event) => setFields((f) => ({ ...f, title: event.target.value }))}
          placeholder="Titolo"
          className={FIELD}
        />
        <div className="flex gap-2">
          <label className="min-w-0 flex-1 text-xs">
            <span className="text-ink-faint mb-1 block">Inizio</span>
            <input
              type="datetime-local"
              value={fields.start}
              onChange={(event) => setFields((f) => ({ ...f, start: event.target.value }))}
              className={FIELD}
            />
          </label>
          <label className="min-w-0 flex-1 text-xs">
            <span className="text-ink-faint mb-1 block">Fine</span>
            <input
              type="datetime-local"
              value={fields.end}
              onChange={(event) => setFields((f) => ({ ...f, end: event.target.value }))}
              className={FIELD}
            />
          </label>
        </div>
        <input
          value={fields.location}
          onChange={(event) => setFields((f) => ({ ...f, location: event.target.value }))}
          placeholder="Luogo (opzionale)"
          className={FIELD}
        />

        {error &&
          (error.reason === "token" ? (
            <div className="border-border rounded-md border p-3 text-center">
              <p className="text-ink-soft text-xs">La sessione con Google è scaduta o manca il permesso.</p>
              <form action={reconnectGoogle}>
                <Button type="submit" variant="outline" size="sm" className="mt-2">
                  Riconnetti Google
                </Button>
              </form>
            </div>
          ) : (
            <p className="text-destructive text-xs">
              {error.detail === "end-before-start"
                ? "La fine deve essere dopo l'inizio."
                : "Non sono riuscito a creare l'impegno. Riprova."}
            </p>
          ))}
      </div>

      <div className="border-border flex shrink-0 justify-end gap-2 border-t px-5 py-3.5">
        {/* Bottone normale con onClick={onClose}, non <DialogClose>: quello
            chiude sempre il <Dialog> esterno via Base UI — per il "+" di
            Impegni coincide con "chiudi tutto" (giusto lì), ma nel widget
            Calendario onClose torna solo alla vista del giorno senza
            chiudere il dialog intero (bug reale, trovato dal vivo: con
            DialogClose "Annulla" chiudeva tutto invece di tornare
            indietro). La × in alto resta un vero DialogClose — quella
            deve sempre chiudere tutto, in entrambi i casi. */}
        <button
          type="button"
          onClick={onClose}
          className="border-border text-ink-soft hover:text-foreground rounded-md border px-3 py-1.5 text-xs"
        >
          Annulla
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={pending || !fields.title.trim()}
          className="bg-brand-soft text-primary rounded-md px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
        >
          {pending ? "Creo…" : "Crea impegno"}
        </button>
      </div>
    </DialogPopup>
  )
}
