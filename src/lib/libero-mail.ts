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

/** Solo per la scheda Account del dialog Impostazioni: sapere se Libero è
 * configurato senza doverci davvero aprire una connessione IMAP — stessa
 * coppia di env var di getLiberoMessages qui sotto, un solo posto che sa
 * quali sono. */
export function isLiberoConfigured(): boolean {
  return Boolean(process.env.LIBERO_EMAIL && process.env.LIBERO_APP_PASSWORD)
}

/**
 * Tutta la posta in arrivo (INBOX) di Libero via IMAP: niente OAuth/API, si
 * legge con le credenziali dell'account (password applicativa consigliata —
 * vedi docs/SETUP-LIBERO.md). Non filtra per importanza: Claudio vuole vedere
 * tutto (vedi PRD §8, Fase 3).
 */
export async function getLiberoMessages(): Promise<LiberoResult> {
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
      const uids = await client.search({ all: true }, { uid: true })
      if (!uids || uids.length === 0) return { ok: true, messages: [] }

      // Le più recenti prima: gli uid crescono nel tempo, si prendono le
      // ultime 25 e si ordinano a ritroso.
      const recent = uids.slice(-25).reverse()

      // Il terzo argomento { uid: true } è quello che conta: dice a fetch()
      // di leggere `recent` come UID, non come numeri di sequenza — messo
      // solo nel query object (secondo argomento) non fa niente, `uid: true`
      // lì significa solo "includi l'UID nella risposta". Bug reale trovato
      // verificando con le vere credenziali di Claudio: falliva sempre con
      // errore generico "api", non era un problema di rete.
      const messages: LiberoMessage[] = []
      for await (const msg of client.fetch(recent, { envelope: true, uid: true }, { uid: true })) {
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
