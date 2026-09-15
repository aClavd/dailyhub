"use client"

import { Plus } from "lucide-react"
import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogPopup, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { createCalendarEvent } from "@/lib/actions/calendar"
import { reconnectGoogle } from "@/lib/actions/auth"
import { datetimeLocalValue } from "@/lib/datetime"
import type { CalendarResult } from "@/lib/google/calendar"

const FIELD =
  "bg-muted border-border focus:outline-primary w-full rounded-md border px-2.5 py-1.5 text-sm focus:outline-2"

/** Prossima mezz'ora tonda — un default sensato invece di partire da "ora"
 * spaccata al minuto. */
function defaultStart(): Date {
  const d = new Date()
  d.setSeconds(0, 0)
  d.setMinutes(d.getMinutes() <= 30 ? 30 : 60)
  return d
}

function initialFields() {
  const start = defaultStart()
  const end = new Date(start.getTime() + 60 * 60_000)
  return { title: "", start: datetimeLocalValue(start), end: datetimeLocalValue(end), location: "" }
}

/**
 * "+" nell'intestazione del blocco Impegni (agenda-card.tsx) — crea un
 * evento vero su Google Calendar. Dialog controllato (non come
 * layout-manager.tsx, che si affida all'apertura/chiusura automatica di
 * Base UI) solo perché qui serve poterlo chiudere da codice a creazione
 * riuscita, non solo su azione dell'utente.
 */
export function NewEventDialog({ onCreated }: { onCreated: (today: CalendarResult) => void }) {
  const [open, setOpen] = useState(false)
  const [fields, setFields] = useState(initialFields)
  const [error, setError] = useState<{ reason: "token" | "api"; detail?: string } | null>(null)
  const [pending, startTransition] = useTransition()

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setFields(initialFields())
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
      onCreated(result.today)
      handleOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        aria-label="Nuovo impegno"
        title="Nuovo impegno"
        className="text-ink-faint hover:bg-muted hover:text-foreground grid size-6 shrink-0 place-items-center rounded-md transition-colors"
      >
        <Plus className="size-3.5" />
      </DialogTrigger>
      <DialogPopup className="max-w-md">
        <div className="border-border flex shrink-0 items-center justify-between border-b px-5 py-3.5">
          <DialogTitle>Nuovo impegno</DialogTitle>
          <DialogClose
            aria-label="Chiudi"
            className="text-ink-faint hover:bg-muted hover:text-foreground grid size-7 shrink-0 place-items-center rounded-md text-base leading-none"
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
          <DialogClose
            className="border-border text-ink-soft hover:text-foreground rounded-md border px-3 py-1.5 text-xs"
          >
            Annulla
          </DialogClose>
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
    </Dialog>
  )
}
