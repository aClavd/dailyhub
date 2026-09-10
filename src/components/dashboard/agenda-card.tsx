import type { ReactNode } from "react"

import { signIn } from "@/auth"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { oraBreve, traQuanto } from "@/lib/datetime"
import type { CalendarEvent, CalendarResult } from "@/lib/google/calendar"
import { cn } from "@/lib/utils"

type RowState = "allday" | "now" | "next" | "upcoming" | "past"

export function AgendaCard({ result }: { result: CalendarResult }) {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Impegni di oggi</CardTitle>
        <CardAction>
          <span className="font-mono text-[0.7rem] tracking-wide text-ink-faint uppercase">
            {result.ok ? countLabel(result.events.length) : "—"}
          </span>
        </CardAction>
      </CardHeader>
      <CardContent>
        {result.ok ? (
          <AgendaList events={result.events} />
        ) : (
          <AgendaError reason={result.reason} />
        )}
      </CardContent>
    </Card>
  )
}

function countLabel(n: number) {
  if (n === 0) return "niente"
  return `${n} ${n === 1 ? "evento" : "eventi"}`
}

function AgendaList({ events }: { events: CalendarEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-ink-faint">
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
      {allDay.map((e) => (
        <EventRow key={e.id} event={e} state="allday" />
      ))}
      {timed.map((e) => {
        const start = new Date(e.start as string)
        const end = e.end ? new Date(e.end) : null
        const running = start <= now && (end ? end > now : false)
        const past = end ? end <= now : start <= now
        const state: RowState = running
          ? "now"
          : e.id === nextId
            ? "next"
            : past
              ? "past"
              : "upcoming"
        return <EventRow key={e.id} event={e} state={state} />
      })}
    </div>
  )
}

function EventRow({ event, state }: { event: CalendarEvent; state: RowState }) {
  const highlight = state === "now" || state === "next"

  return (
    <div
      className={cn(
        "grid grid-cols-[3.25rem_1fr] gap-3 rounded-md border-t border-border px-2 py-2.5 text-sm first:border-t-0",
        highlight &&
          "border-t-transparent bg-brand-soft shadow-[inset_2px_0_0_var(--primary)]",
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
    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-ink-soft">
      {event.meetUrl && (
        <a
          href={event.meetUrl}
          target="_blank"
          rel="noreferrer"
          className="font-medium hover:text-foreground hover:underline"
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
          : "border border-border text-ink-soft",
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
      <p className="py-8 text-center text-sm text-ink-soft">
        Non riesco a leggere il calendario adesso. Riprova tra poco.
      </p>
    )
  }
  return (
    <div className="py-7 text-center">
      <p className="text-sm text-ink-soft">
        La sessione con Google è scaduta.
      </p>
      <form action={reconnectGoogle}>
        <Button type="submit" variant="outline" size="sm" className="mt-3">
          Riconnetti Google
        </Button>
      </form>
    </div>
  )
}
