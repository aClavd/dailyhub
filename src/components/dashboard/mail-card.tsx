"use client"

import { Filter } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"

import { useBoard } from "@/components/board/board-context"
import { useReportEmphasis, type WidgetEmphasis } from "@/components/board/widget-shell"
import { Button } from "@/components/ui/button"
import { Dialog, DialogTrigger } from "@/components/ui/dialog"
import { Segmented } from "@/components/widgets/_shared"
import { reconnectGoogle } from "@/lib/actions/auth"
import { refreshMail } from "@/lib/actions/mail"
import type { MailMessage, MailProvider, MailResult, ProviderStatus } from "@/lib/mail"
import type { MailFilterSummary } from "@/lib/queries/mail-filters"
import { usePolling } from "@/lib/use-polling"
import { cn } from "@/lib/utils"

import { MailFilterDialog } from "./mail-filter-dialog"
import { MailNotifier } from "./mail-notifier"

// Stesso intervallo/stesso motivo di agenda-card.tsx: abbastanza vicino al
// tempo reale, enorme margine sulle quote gratuite di Gmail.
const REFRESH_MS = 90_000

/** Possiede lo stato della posta — parte da `initial` (letto una volta da
 * page.tsx) e lo aggiorna da solo col polling, senza bisogno di ricaricare
 * la pagina per vedere una mail appena arrivata. Possiede anche le regole
 * "mail importante" (`initialFilters`, lette da page.tsx insieme a
 * `initial`: DEVONO esserci fin dal primo render, non solo quando si apre
 * il dialog di gestione — altrimenti l'avviso in sottofondo non
 * scatterebbe mai finché non apri il dialog almeno una volta). Rende sia
 * MailBody (presentazionale) sia MailNotifier sullo STESSO `result`/
 * `filters`, non due letture indipendenti — altrimenti una mail arrivata
 * via polling non farebbe scattare l'avviso finché non si ricarica la
 * pagina, o una regola appena aggiunta non si applicherebbe subito. */
export function MailLive({
  initial,
  initialFilters,
}: {
  initial: MailResult
  initialFilters: MailFilterSummary[]
}) {
  const [result, setResult] = useState(initial)
  const [filters, setFilters] = useState(initialFilters)
  usePolling(() => {
    void refreshMail().then(setResult)
  }, REFRESH_MS)
  return (
    <>
      <MailBody result={result} filters={filters} onFiltersChange={setFilters} />
      <MailNotifier messages={result.messages} filters={filters} />
    </>
  )
}

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
export function MailBody({
  result,
  filters,
  onFiltersChange,
}: {
  result: MailResult
  filters: MailFilterSummary[]
  onFiltersChange: (filters: MailFilterSummary[]) => void
}) {
  const [tab, setTab] = useState<Tab>("Tutte")
  // Sul totale, non sulla tab aperta: il segnale sulla shell riflette lo
  // stato vero, indipendente da quale sezione stai guardando in quel momento.
  const emphasis = useMemo(() => mailEmphasis(result.messages), [result.messages])
  useReportEmphasis(emphasis)

  // Secondo canale, verso il board context invece che verso la shell che
  // racchiude questo blocco: serve al pallino nel rail (rail.tsx), che deve
  // sapere se è arrivato qualcosa di recente ANCHE quando il blocco non è
  // sulla board (quindi non dentro nessuna WidgetShell in quel momento —
  // vedi board.tsx, montaggio nascosto). useBoard() legge sempre dal
  // BoardProvider di livello pagina, indipendente da dove questo componente
  // è montato nel DOM.
  const { setMailHasRecent } = useBoard()
  const hasRecent = emphasis !== "none"
  useEffect(() => {
    setMailHasRecent(hasRecent)
  }, [hasRecent, setMailHasRecent])

  const messages = useMemo(() => {
    if (tab === "Tutte") return result.messages
    return result.messages.filter((m) => m.provider === tab.toLowerCase())
  }, [result.messages, tab])

  return (
    <div>
      <Segmented label="Casella" options={TABS} value={tab} onChange={setTab} />

      <div className="mt-3 mb-2 flex items-center justify-between gap-2">
        <p className="text-ink-faint font-mono text-[0.68rem] tracking-wide uppercase">
          {countLabel(messages.length)}
        </p>
        <Dialog>
          <DialogTrigger
            aria-label="Mail importanti — gestisci regole"
            title="Mail importanti"
            className={cn(
              "grid size-6 shrink-0 place-items-center rounded-md transition-colors",
              filters.length > 0
                ? "text-primary hover:bg-brand-soft"
                : "text-ink-faint hover:bg-muted hover:text-foreground",
            )}
          >
            <Filter className="size-3.5" />
          </DialogTrigger>
          <MailFilterDialog filters={filters} onChange={onFiltersChange} />
        </Dialog>
      </div>
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
