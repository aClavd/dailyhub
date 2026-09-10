import type { ReactNode } from "react"

import { signIn } from "@/auth"
import { Button } from "@/components/ui/button"
import { oraBreve, traQuanto } from "@/lib/datetime"
import type { CalendarEvent, CalendarResult } from "@/lib/google/calendar"
import { cn } from "@/lib/utils"

type RowState = "allday" | "now" | "next" | "upcoming" | "past"

/** Contenuto del blocco Impegni (senza card: il guscio lo mette la board). */
export function AgendaBody({ result }: { result: CalendarResult }) {
  return (
    <div>
      <p className="text-ink-faint mb-2 font-mono text-[0.68rem] tracking-wide uppercase">
        {result.ok ? countLabel(result.events.length) : "—"}
      </p>
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

async function reconnectGoogle() {
  "use server"
  await signIn("google", { redirectTo: "/dashboard" })
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
