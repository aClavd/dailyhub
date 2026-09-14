"use client"

import { useMemo, useState } from "react"
import type { ReactNode } from "react"

import { useReportEmphasis, type WidgetEmphasis } from "@/components/board/widget-shell"
import { Button } from "@/components/ui/button"
import { Segmented } from "@/components/widgets/_shared"
import { reconnectGoogle } from "@/lib/actions/auth"
import type { MailMessage, MailProvider, MailResult, ProviderStatus } from "@/lib/mail"
import { cn } from "@/lib/utils"

// Segmented usa il valore stesso come etichetta del bottone (nessuna
// mappa a parte): i valori sono già le scritte che vuoi vedere.
type Tab = "Tutte" | "Gmail" | "Libero"
const TABS: readonly Tab[] = ["Tutte", "Gmail", "Libero"]

// Fase 5.2: nessuno dei due provider espone lo stato letta/non letta
// (Gmail: format "metadata" senza leggere labelIds; Libero: fetch IMAP
// senza richiedere i flags) — senza quel dato un livello "urgente"
// sarebbe una soglia inventata, non una regola sensata. L'unico segnale
// onesto con i dati che ci sono davvero: è arrivato qualcosa di recente.
const RECENT_MAIL_MIN = 60

function mailEmphasis(messages: readonly MailMessage[]): WidgetEmphasis {
  const now = Date.now()
  const hasRecent = messages.some((m) => {
    if (!m.date) return false
    const ageMin = (now - new Date(m.date).getTime()) / 60_000
    return ageMin >= 0 && ageMin <= RECENT_MAIL_MIN
  })
  return hasRecent ? "attenzione" : "none"
}

/** Contenuto del blocco Mail (senza card: il guscio lo mette la board). */
export function MailBody({ result }: { result: MailResult }) {
  const [tab, setTab] = useState<Tab>("Tutte")
  // Sul totale, non sulla tab aperta: il segnale sulla shell riflette lo
  // stato vero, indipendente da quale sezione stai guardando in quel momento.
  useReportEmphasis(useMemo(() => mailEmphasis(result.messages), [result.messages]))

  const messages = useMemo(() => {
    if (tab === "Tutte") return result.messages
    return result.messages.filter((m) => m.provider === tab.toLowerCase())
  }, [result.messages, tab])

  return (
    <div>
      <Segmented label="Casella" options={TABS} value={tab} onChange={setTab} />

      <p className="text-ink-faint mt-3 mb-2 font-mono text-[0.68rem] tracking-wide uppercase">
        {countLabel(messages.length)}
      </p>
      {messages.length > 0 ? (
        <MailList messages={messages} />
      ) : (
        <p className="text-ink-faint py-6 text-center text-sm">Nessuna mail qui.</p>
      )}
      <ProviderNotices gmail={result.gmail} libero={result.libero} tab={tab} />
    </div>
  )
}

function countLabel(n: number) {
  if (n === 0) return "nessuna mail"
  return `${n} ${n === 1 ? "mail" : "mail"}`
}

function MailList({ messages }: { messages: MailMessage[] }) {
  return (
    <div className="-mx-2">
      {messages.map((m) => (
        <MailRow key={`${m.provider}-${m.id}`} message={m} />
      ))}
    </div>
  )
}

function MailRow({ message }: { message: MailMessage }) {
  const content = (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <ProviderTag provider={message.provider} />
        <span className="truncate font-medium">{message.from}</span>
        {message.date && (
          <span className="text-ink-faint ml-auto shrink-0 font-mono text-[0.68rem]">
            {dateLabel(message.date)}
          </span>
        )}
      </div>
      <p className="mt-0.5 truncate text-sm">{message.subject}</p>
      {message.snippet && (
        <p className="text-ink-soft mt-0.5 truncate text-xs">{message.snippet}</p>
      )}
    </div>
  )

  const rowClass = cn(
    "border-border flex gap-3 border-t border-l-2 px-2.5 py-2.5 text-sm first:border-t-0",
    message.provider === "gmail" ? "border-l-gmail-fg" : "border-l-libero-fg",
  )

  if (message.link) {
    return (
      <a href={message.link} target="_blank" rel="noreferrer" className={cn(rowClass, "hover:bg-muted")}>
        {content}
      </a>
    )
  }
  return <div className={rowClass}>{content}</div>
}

function ProviderTag({ provider }: { provider: MailProvider }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center rounded-full px-2 text-[0.62rem] font-semibold tracking-wide uppercase",
        provider === "gmail" ? "bg-gmail-bg text-gmail-fg" : "bg-libero-bg text-libero-fg",
      )}
    >
      {provider === "gmail" ? "Gmail" : "Libero"}
    </span>
  )
}

/** "09:30" se è di oggi, altrimenti "mer 10". */
function dateLabel(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  if (sameDay) {
    return new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" }).format(d)
  }
  return new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short" }).format(d)
}

/** Piccoli avvisi sotto la lista se un provider non va — solo quelli rilevanti per la sezione aperta. */
function ProviderNotices({
  gmail,
  libero,
  tab,
}: {
  gmail: ProviderStatus
  libero: ProviderStatus
  tab: Tab
}) {
  const notices: ReactNode[] = []

  if (!gmail.ok && tab !== "Libero") {
    if (gmail.reason === "token") {
      notices.push(
        <div key="gmail" className="flex items-center gap-2">
          <span className="text-ink-faint text-xs">Gmail: sessione scaduta.</span>
          <form action={reconnectGoogle}>
            <Button type="submit" variant="outline" size="sm" className="h-6 px-2 text-[0.68rem]">
              Riconnetti
            </Button>
          </form>
        </div>,
      )
    } else if (gmail.reason !== "unauthenticated") {
      notices.push(
        <p key="gmail" className="text-ink-faint text-xs" title={gmail.detail}>
          Gmail: non riesco a leggerla adesso.
        </p>,
      )
    }
  }

  if (!libero.ok && tab !== "Gmail") {
    notices.push(
      <p
        key="libero"
        className="text-ink-faint text-xs"
        // Il dettaglio tecnico (es. l'errore IMAP vero) sta nel title, al
        // passaggio del mouse — non è un messaggio da mostrare sempre, ma
        // utile per capire cosa non va senza dover guardare i log del server.
        title={libero.reason === "api" ? libero.detail : undefined}
      >
        {libero.reason === "not-configured"
          ? "Libero: non ancora configurata (docs/SETUP-LIBERO.md)."
          : "Libero: non riesco a leggerla adesso."}
      </p>,
    )
  }

  if (notices.length === 0) return null
  return <div className="border-border mt-3 space-y-1.5 border-t pt-3">{notices}</div>
}
