"use client"

import { Plus } from "lucide-react"
import type { ReactNode } from "react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogTrigger } from "@/components/ui/dialog"
import { EmphasisReporter } from "@/components/board/widget-shell"
import { agendaEmphasis } from "@/lib/agenda-signal"
import { reconnectGoogle } from "@/lib/actions/auth"
import { refreshAgenda } from "@/lib/actions/calendar"
import { oraBreve, traQuanto } from "@/lib/datetime"
import type { CalendarEvent, CalendarResult } from "@/lib/google/calendar"
import { usePolling } from "@/lib/use-polling"
import { cn } from "@/lib/utils"

import { AgendaNotifier } from "./agenda-notifier"
import { NewEventForm } from "./new-event-form"

// Ogni 90s: abbastanza vicino al tempo reale da sembrare "live" senza
// bisogno di ricaricare, con enorme margine sulle quote gratuite di
// Google Calendar (pensate per ben più di una chiamata ogni 90s a
// persona) — vedi anche mail-card.tsx (stesso intervallo, stesso motivo).
const REFRESH_MS = 90_000

type RowState = "allday" | "now" | "next" | "upcoming" | "past"

// agendaEmphasis/URGENT_MIN/ATTENTION_MIN: spostati in lib/agenda-signal.ts
// (Right Sidebar, Fase B) — un solo calcolo di "quanto manca al prossimo
// impegno" condiviso con right-panel-live.tsx, non più una copia qui.

/**
 * Possiede lo stato degli impegni di oggi — parte da `initial` (letto una
 * volta da page.tsx, server-side) e lo tiene aggiornato da due fonti: il
 * polling (ogni REFRESH_MS, usePolling) e la creazione di un nuovo impegno
 * da NewEventForm. Rende sia AgendaBody sia AgendaNotifier sullo STESSO
 * stato, non due letture indipendenti: altrimenti un impegno arrivato via
 * polling non farebbe scattare l'avviso di AgendaNotifier finché non si
 * ricarica la pagina — i due andrebbero fuori sincrono.
 */
export function AgendaLive({ initial, todayKey }: { initial: CalendarResult; todayKey: string }) {
  const [result, setResult] = useState(initial)
  usePolling(() => {
    void refreshAgenda().then(setResult)
  }, REFRESH_MS)

  const refresh = () => void refreshAgenda().then(setResult)

  return (
    <>
      <AgendaBody result={result} onCreated={refresh} />
      {result.ok && <AgendaNotifier events={result.events} todayKey={todayKey} />}
    </>
  )
}

/** Contenuto del blocco Impegni (senza card: il guscio lo mette la
 * board) — puramente presentazionale, lo stato vive in AgendaLive sopra. */
export function AgendaBody({
  result,
  onCreated,
}: {
  result: CalendarResult
  /** Un impegno è stato creato — AgendaLive rilegge da sé (refreshAgenda). */
  onCreated: () => void
}) {
  const [open, setOpen] = useState(false)
  const emphasis = result.ok ? agendaEmphasis(result.events) : { level: "none" as const }
  return (
    <div>
      <EmphasisReporter level={emphasis.level} label={emphasis.label} />
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-ink-faint font-mono text-[0.68rem] tracking-wide uppercase">
          {result.ok ? countLabel(result.events.length) : "—"}
        </p>
        {/* Dialog posseduto qui (non da NewEventForm, che è solo il
            contenuto — stesso schema di MailFilterDialog in mail-card.tsx). */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            aria-label="Nuovo impegno"
            title="Nuovo impegno"
            className="text-ink-faint hover:bg-muted hover:text-foreground grid size-6 shrink-0 place-items-center rounded-md transition-colors"
          >
            <Plus className="size-3.5" />
          </DialogTrigger>
          <NewEventForm open={open} onCreated={onCreated} onClose={() => setOpen(false)} />
        </Dialog>
      </div>
      {result.ok ? (
        <AgendaList events={result.events} />
      ) : (
        <AgendaError reason={result.reason} />
      )}
    </div>
  )
}

function countLabel(n: number) {
  if (n === 0) return "niente in agenda"
  return `${n} ${n === 1 ? "evento" : "eventi"}`
}

function AgendaList({ events }: { events: CalendarEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="text-ink-faint py-6 text-center text-sm">
        Nessun impegno in calendario per oggi.
      </p>
    )
  }

  const now = new Date()
  const allDay = events.filter((e) => e.allDay)
  const timed = events.filter((e) => !e.allDay && e.start)
  const nextId = timed.find((e) => new Date(e.start as string) > now)?.id ?? null

  return (
    <div className="-mx-2">
      {allDay.map((event) => (
        <EventRow key={event.id} event={event} state="allday" />
      ))}
      {timed.map((event) => {
        const start = new Date(event.start as string)
        const end = event.end ? new Date(event.end) : null
        const running = start <= now && (end ? end > now : false)
        const past = end ? end <= now : start <= now
        const state: RowState = running
          ? "now"
          : event.id === nextId
            ? "next"
            : past
              ? "past"
              : "upcoming"
        return <EventRow key={event.id} event={event} state={state} />
      })}
    </div>
  )
}

function EventRow({ event, state }: { event: CalendarEvent; state: RowState }) {
  const highlight = state === "now" || state === "next"

  return (
    <div
      className={cn(
        "border-border grid grid-cols-[3.25rem_1fr] gap-3 rounded-md border-t px-2 py-2.5 text-sm first:border-t-0",
        highlight &&
          "bg-brand-soft border-t-transparent shadow-[inset_2px_0_0_var(--primary)]",
        state === "past" && "opacity-55",
      )}
    >
      <div
        className={cn(
          "pt-0.5 text-right font-mono text-xs tabular-nums",
          highlight ? "text-primary" : "text-ink-soft",
          state === "past" && "text-ink-faint",
        )}
      >
        {state === "allday" ? "—" : oraBreve(event.start as string)}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-medium">{event.title}</span>
          {state === "allday" && <Tag>tutto il giorno</Tag>}
          {state === "now" && <Tag tone="brand">in corso</Tag>}
          {state === "next" && event.start && (
            <Tag tone="brand">{traQuanto(new Date(event.start))}</Tag>
          )}
        </div>
        <EventSub event={event} />
      </div>
    </div>
  )
}

function EventSub({ event }: { event: CalendarEvent }) {
  if (!event.location && !event.meetUrl) return null
  return (
    <div className="text-ink-soft mt-0.5 flex flex-wrap items-center gap-x-3 text-xs">
      {event.meetUrl && (
        <a
          href={event.meetUrl}
          target="_blank"
          rel="noreferrer"
          className="hover:text-foreground font-medium hover:underline"
        >
          Google Meet ↗
        </a>
      )}
      {event.location && <span>{event.location}</span>}
    </div>
  )
}

function Tag({
  children,
  tone = "muted",
}: {
  children: ReactNode
  tone?: "muted" | "brand"
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-full px-2 text-[0.62rem] font-semibold tracking-wide uppercase",
        tone === "brand"
          ? "bg-primary text-primary-foreground"
          : "border-border text-ink-soft border",
      )}
    >
      {children}
    </span>
  )
}

function AgendaError({ reason }: { reason: "unauthenticated" | "token" | "api" }) {
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
