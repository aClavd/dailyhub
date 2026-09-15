"use client"

import { useEffect } from "react"

import type { MailMessage } from "@/lib/mail"
import type { MailFilterSummary } from "@/lib/queries/mail-filters"
import { useLocalStorage } from "@/lib/use-local-storage"

import { useToast } from "./toast-context"

/** Una regola combacia se il suo testo (case-insensitive) compare nel
 * mittente O nell'oggetto — una sola regola vale per entrambi i campi,
 * niente "campo" da scegliere ogni volta (mail-filter-dialog.tsx). */
function matchingFilter(
  message: MailMessage,
  filters: readonly MailFilterSummary[],
): MailFilterSummary | null {
  const haystack = `${message.from} ${message.subject}`.toLowerCase()
  return filters.find((f) => haystack.includes(f.pattern.toLowerCase())) ?? null
}

/**
 * Avviso quando arriva una mail che combacia con una regola "importante"
 * (mail-filter-dialog.tsx) — monta dentro MailLive (mail-card.tsx), riusa
 * gli stessi messaggi già scaricati lì (niente chiamata in più). Dedup per
 * non ripetere il popup: stesso schema già corretto per gli impegni in
 * agenda-notifier.tsx — il "controlla e segna" dentro il `set` funzionale
 * di useLocalStorage, non un ref, l'unico modo verificato in questa
 * sessione che resta corretto anche sotto Strict Mode. Non scoped per
 * giorno come gli impegni: la posta non "si azzera" ogni mezzanotte, e non
 * ha senso ri-avvisare la stessa mail il giorno dopo solo perché è ancora
 * nella lista.
 */
export function MailNotifier({
  messages,
  filters,
}: {
  messages: readonly MailMessage[]
  filters: readonly MailFilterSummary[]
}) {
  const [, setNotified] = useLocalStorage<string[]>("dailyhub:notified-mail", [])
  const pushToast = useToast()

  useEffect(() => {
    if (filters.length === 0) return
    for (const message of messages) {
      const match = matchingFilter(message, filters)
      if (!match) continue
      const key = `${message.provider}-${message.id}`

      setNotified((prev) => {
        if (prev.includes(key)) return prev
        pushToast({
          id: `mail-${key}`,
          title: message.subject.trim() || "(senza oggetto)",
          label: message.from,
          accent: "urgente",
        })
        return [...prev, key]
      })
    }
    // setNotified/pushToast intenzionalmente fuori: store/contesto stabili,
    // non serve ricrearli tra le dipendenze.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, filters])

  return null
}
