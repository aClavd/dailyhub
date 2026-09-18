import "server-only"

import { cache } from "react"

import { auth } from "@/auth"
import { getGmailMessages } from "@/lib/google/gmail"
import { getLiberoMessages } from "@/lib/libero-mail"

export type MailProvider = "gmail" | "libero"

export type MailMessage = {
  id: string
  provider: MailProvider
  from: string
  fromEmail: string | null
  subject: string
  snippet: string | null
  date: string | null
  link: string | null
  /** Stato letto/non letto nativo del provider (solo Gmail per ora — vedi
   * lib/google/gmail.ts). Libero resta `false`: leggere il flag IMAP
   * `\Seen` è fattibile ma è un'altra modifica a sé, fuori da questo giro. */
  unread: boolean
}

export type ProviderStatus =
  | { ok: true }
  | {
      ok: false
      reason: "unauthenticated" | "token" | "not-configured" | "api"
      detail?: string
    }

export type MailResult = {
  messages: MailMessage[]
  gmail: ProviderStatus
  libero: ProviderStatus
}

/**
 * Unisce la posta di Gmail e Libero in un'unica lista, più recenti prima —
 * tutta la posta in arrivo, non filtrata per importanza (Claudio decide lui
 * cosa conta). Ogni provider ha il suo stato: se uno dei due non è
 * configurato o fallisce, l'altro continua a mostrare quello che ha (vedi
 * PRD §8, Fase 3 — "interfaccia comune ai due provider"). Il campo
 * `provider` su ogni messaggio permette alla UI di offrire le 3 sezioni
 * (tutte / solo Gmail / solo Libero) senza richieste separate.
 *
 * Avvolta in `cache()` (Right Sidebar, Fase B) — stesso motivo di
 * getTodayEvents() in lib/google/calendar.ts: sia MailSection (page.tsx)
 * sia il Daily Brief del pannello destro la chiamano nella stessa
 * richiesta, deduplicata invece di due giri reali verso Gmail/Libero.
 *
 * Controllo sessione QUI (Pre-Deploy Security Audit v1), non solo nel
 * redirect di dashboard/page.tsx: getGmailMessages() già si autoprotegge
 * (torna "unauthenticated" senza sessione), ma getLiberoMessages() usa
 * credenziali server-side GLOBALI (LIBERO_EMAIL/LIBERO_APP_PASSWORD, un
 * solo account condiviso, non per-utente) e prima di questa modifica non
 * aveva nessun controllo proprio — chiamata da qui, da refreshMail()
 * (Server Action usata da MailLive) senza nessun altro cancello in mezzo.
 * "La dashboard ha già il redirect" non basta: chi chiama refreshMail/
 * getMail deve poter dimostrare da SOLO di avere una sessione valida,
 * senza dare per scontato che il chiamante l'abbia già verificata.
 */
export const getMail = cache(async (): Promise<MailResult> => {
  const session = await auth()
  if (!session?.user?.id) {
    const reason = { ok: false as const, reason: "unauthenticated" as const }
    return { messages: [], gmail: reason, libero: reason }
  }

  const [gmail, libero] = await Promise.all([getGmailMessages(), getLiberoMessages()])

  const messages: MailMessage[] = [
    ...(gmail.ok
      ? gmail.messages.map((m) => ({ ...m, provider: "gmail" as const }))
      : []),
    ...(libero.ok
      ? libero.messages.map((m) => ({
          ...m,
          provider: "libero" as const,
          snippet: null,
          link: null,
          unread: false,
        }))
      : []),
  ].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))

  return {
    messages,
    gmail: gmail.ok ? { ok: true } : { ok: false, reason: gmail.reason, detail: gmail.detail },
    libero: libero.ok ? { ok: true } : { ok: false, reason: libero.reason, detail: libero.detail },
  }
})
