import "server-only"

import { auth } from "@/auth"

export type GmailMessage = {
  id: string
  from: string
  fromEmail: string | null
  subject: string
  snippet: string | null
  date: string | null
  link: string
}

export type GmailResult =
  | { ok: true; messages: GmailMessage[] }
  | { ok: false; reason: "unauthenticated" | "token" | "api"; detail?: string }

type GmailListResponse = { messages?: { id: string }[] }

type GmailHeader = { name: string; value: string }

type GmailMessageDetail = {
  id: string
  snippet?: string
  payload?: { headers?: GmailHeader[] }
}

function header(headers: GmailHeader[] | undefined, name: string) {
  return headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value
}

/** Spezza "Nome Cognome <mail@dominio.it>" in nome e indirizzo. */
function parseFrom(raw: string | undefined): { name: string; email: string | null } {
  if (!raw) return { name: "(mittente sconosciuto)", email: null }
  const match = raw.match(/^(.*?)\s*<(.+)>$/)
  if (match) {
    const name = match[1].replace(/^"|"$/g, "").trim()
    return { name: name || match[2], email: match[2] }
  }
  return { name: raw, email: raw.includes("@") ? raw : null }
}

/**
 * Tutta la posta in arrivo di Gmail (non solo importanti/starred: Claudio
 * vuole vedere tutto, decide lui cosa conta — vedi PRD §8, Fase 3).
 */
export async function getGmailMessages(): Promise<GmailResult> {
  const session = await auth()
  if (!session?.user) return { ok: false, reason: "unauthenticated" }
  if (session.error || !session.accessToken) {
    return { ok: false, reason: "token", detail: session.error }
  }

  const listUrl = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages")
  listUrl.searchParams.set("q", "in:inbox")
  listUrl.searchParams.set("maxResults", "25")

  let listRes: Response
  try {
    listRes = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      cache: "no-store",
    })
  } catch (err) {
    return { ok: false, reason: "api", detail: String(err) }
  }

  if (listRes.status === 401) return { ok: false, reason: "token" }
  if (!listRes.ok) return { ok: false, reason: "api", detail: `HTTP ${listRes.status}` }

  const list = (await listRes.json()) as GmailListResponse
  const ids = list.messages ?? []
  if (ids.length === 0) return { ok: true, messages: [] }

  // L'API Gmail non ha un "list con dettagli": un GET per messaggio (in
  // parallelo). Per uso personale con poche mail importanti va benissimo.
  const details = await Promise.all(
    ids.map(async ({ id }) => {
      const url = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}`)
      url.searchParams.set("format", "metadata")
      url.searchParams.append("metadataHeaders", "From")
      url.searchParams.append("metadataHeaders", "Subject")
      url.searchParams.append("metadataHeaders", "Date")
      try {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${session.accessToken}` },
          cache: "no-store",
        })
        if (!res.ok) return null
        return (await res.json()) as GmailMessageDetail
      } catch {
        return null
      }
    }),
  )

  const messages: GmailMessage[] = details
    .filter((d): d is GmailMessageDetail => d !== null)
    .map((d) => {
      const { name, email } = parseFrom(header(d.payload?.headers, "From"))
      const dateHeader = header(d.payload?.headers, "Date")
      return {
        id: d.id,
        from: name,
        fromEmail: email,
        subject: header(d.payload?.headers, "Subject")?.trim() || "(senza oggetto)",
        snippet: d.snippet?.trim() || null,
        date: dateHeader ? new Date(dateHeader).toISOString() : null,
        link: `https://mail.google.com/mail/u/0/#all/${d.id}`,
      }
    })
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))

  return { ok: true, messages }
}
