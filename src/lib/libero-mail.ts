import "server-only"

import { ImapFlow } from "imapflow"

export type LiberoMessage = {
  id: string
  from: string
  fromEmail: string | null
  subject: string
  date: string | null
}

export type LiberoResult =
  | { ok: true; messages: LiberoMessage[] }
  | { ok: false; reason: "not-configured" | "api"; detail?: string }

/**
 * Mail "importanti" da Libero via IMAP: niente OAuth/API, si legge con le
 * credenziali dell'account (password applicativa consigliata — vedi
 * docs/SETUP-LIBERO.md). "Importante" = messaggi contrassegnati speciali
 * (flag \Flagged), stesso criterio di partenza di Gmail (vedi PRD §8, Fase 3).
 */
export async function getImportantLibero(): Promise<LiberoResult> {
  const email = process.env.LIBERO_EMAIL
  const password = process.env.LIBERO_APP_PASSWORD
  if (!email || !password) return { ok: false, reason: "not-configured" }

  const client = new ImapFlow({
    host: "imapmail.libero.it",
    port: 993,
    secure: true,
    auth: { user: email, pass: password },
    logger: false,
  })

  try {
    await client.connect()
    const lock = await client.getMailboxLock("INBOX")
    try {
      const uids = await client.search({ flagged: true }, { uid: true })
      if (!uids || uids.length === 0) return { ok: true, messages: [] }

      // Le più recenti prima: gli uid crescono nel tempo, si prendono le
      // ultime 12 e si ordinano a ritroso.
      const recent = uids.slice(-12).reverse()

      const messages: LiberoMessage[] = []
      for await (const msg of client.fetch(recent, { envelope: true, uid: true })) {
        const from = msg.envelope?.from?.[0]
        messages.push({
          id: String(msg.uid),
          from: from?.name?.trim() || from?.address || "(mittente sconosciuto)",
          fromEmail: from?.address ?? null,
          subject: msg.envelope?.subject?.trim() || "(senza oggetto)",
          date: msg.envelope?.date ? new Date(msg.envelope.date).toISOString() : null,
        })
      }
      messages.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
      return { ok: true, messages }
    } finally {
      lock.release()
    }
  } catch (err) {
    return { ok: false, reason: "api", detail: err instanceof Error ? err.message : String(err) }
  } finally {
    // logout() prova a chiudere in modo pulito; se la connessione è già
    // saltata (errore sopra) non deve far esplodere la richiesta.
    await client.logout().catch(() => {})
  }
}
