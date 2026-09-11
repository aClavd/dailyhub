import "server-only"

import { getImportantGmail } from "@/lib/google/gmail"
import { getImportantLibero } from "@/lib/libero-mail"

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
 * Unisce le mail importanti di Gmail e Libero in un'unica lista, più recenti
 * prima. Ogni provider ha il suo stato: se uno dei due non è configurato o
 * fallisce, l'altro continua a mostrare quello che ha (vedi PRD §8, Fase 3 —
 * "interfaccia comune ai due provider").
 */
export async function getImportantMail(): Promise<MailResult> {
  const [gmail, libero] = await Promise.all([getImportantGmail(), getImportantLibero()])

  const messages: MailMessage[] = [
    ...(gmail.ok
      ? gmail.messages.map((m) => ({ ...m, provider: "gmail" as const }))
      : []),
    ...(libero.ok
      ? libero.messages.map((m) => ({ ...m, provider: "libero" as const, snippet: null, link: null }))
      : []),
  ].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))

  return {
    messages,
    gmail: gmail.ok ? { ok: true } : { ok: false, reason: gmail.reason, detail: gmail.detail },
    libero: libero.ok ? { ok: true } : { ok: false, reason: libero.reason, detail: libero.detail },
  }
}
