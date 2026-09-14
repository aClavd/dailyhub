"use client"

import { useEffect } from "react"

import { useLocalStorage } from "@/lib/use-local-storage"

import { useToast } from "./toast-context"

// Confermato con Claudio: le 20:00, non prima — usa il Diario a fine giornata.
const REMINDER_HOUR = 20
// Ogni 5 minuti basta: non serve la precisione al minuto di un countdown.
const CHECK_EVERY_MS = 5 * 60_000

/**
 * Promemoria per scrivere nel Diario — solo se non hai ancora scritto
 * niente oggi, solo dopo REMINDER_HOUR, una volta sola al giorno (segnato
 * su localStorage, si azzera da sé il giorno dopo). Monta in page.tsx,
 * fuori dalla board: non dipende da quale layout hai attivo.
 */
export function DiarioReminder({
  hasWrittenToday,
  todayKey,
}: {
  hasWrittenToday: boolean
  todayKey: string
}) {
  const [, setReminded] = useLocalStorage(`dailyhub:diario-reminded:${todayKey}`, false)
  const pushToast = useToast()

  useEffect(() => {
    if (hasWrittenToday) return

    function check() {
      if (new Date().getHours() < REMINDER_HOUR) return
      setReminded((already) => {
        if (already) return already
        pushToast({
          id: `diario-${todayKey}`,
          title: "Diario di oggi",
          label: "Non hai ancora scritto niente oggi",
          accent: "attenzione",
        })
        return true
      })
    }

    check()
    const id = window.setInterval(check, CHECK_EVERY_MS)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasWrittenToday, todayKey])

  return null
}
