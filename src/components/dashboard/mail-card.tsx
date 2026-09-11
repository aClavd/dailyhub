import type { ReactNode } from "react"

import { signIn } from "@/auth"
import { Button } from "@/components/ui/button"
import type { MailMessage, MailResult, ProviderStatus } from "@/lib/mail"
import { cn } from "@/lib/utils"

/** Contenuto del blocco Mail (senza card: il guscio lo mette la board). */
export function MailBody({ result }: { result: MailResult }) {
  return (
    <div>
      <p className="text-ink-faint mb-2 font-mono text-[0.68rem] tracking-wide uppercase">
        {countLabel(result.messages.length)}
      </p>
      {result.messages.length > 0 ? (
        <MailList messages={result.messages} />
      ) : (
        <p className="text-ink-faint py-6 text-center text-sm">
          Nessuna mail importante al momento.
        </p>
      )}
      <ProviderNotices gmail={result.gmail} libero={result.libero} />
    </div>
  )
}

function countLabel(n: number) {
  if (n === 0) return "niente di importante"
  return `${n} ${n === 1 ? "mail" : "mail"} importanti`
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

  const rowClass = "border-border rounded-md border-t px-2 py-2.5 text-sm first:border-t-0"

  if (message.link) {
    return (
      <a
        href={message.link}
        target="_blank"
        rel="noreferrer"
        className={cn(rowClass, "hover:bg-muted flex gap-3")}
      >
        {content}
      </a>
    )
  }
  return <div className={cn(rowClass, "flex gap-3")}>{content}</div>
}

function ProviderTag({ provider }: { provider: MailMessage["provider"] }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center rounded-full px-2 text-[0.62rem] font-semibold tracking-wide uppercase",
        provider === "gmail"
          ? "border-border text-ink-soft border"
          : "bg-primary text-primary-foreground",
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

async function reconnectGoogle() {
  "use server"
  await signIn("google", { redirectTo: "/dashboard" })
}

/** Piccoli avvisi sotto la lista se un provider non va — l'altro intanto continua a mostrare quello che ha. */
function ProviderNotices({ gmail, libero }: { gmail: ProviderStatus; libero: ProviderStatus }) {
  const notices: ReactNode[] = []

  if (!gmail.ok) {
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
        <p key="gmail" className="text-ink-faint text-xs">
          Gmail: non riesco a leggerla adesso.
        </p>,
      )
    }
  }

  if (!libero.ok) {
    notices.push(
      <p key="libero" className="text-ink-faint text-xs">
        {libero.reason === "not-configured"
          ? "Libero: non ancora configurata (docs/SETUP-LIBERO.md)."
          : "Libero: non riesco a leggerla adesso."}
      </p>,
    )
  }

  if (notices.length === 0) return null
  return <div className="border-border mt-3 space-y-1.5 border-t pt-3">{notices}</div>
}
