"use client"

import { useEffect } from "react"

import { Button } from "@/components/ui/button"

/**
 * Production Readiness Audit v1 — prima non esisteva NESSUN error
 * boundary: un errore reale non gestito (es. il database irraggiungibile
 * durante il caricamento iniziale della dashboard — `dashboard/page.tsx`
 * non avvolge le sue query in try/catch, per scelta: ogni query verso
 * Google/Gmail/Libero/Spotify torna già un risultato "non ok" da sola,
 * mai un'eccezione — ma una vera interruzione del database sì) faceva
 * cadere l'utente sulla pagina d'errore generica di Next, non su un
 * messaggio DailyHub. Questo file è la convenzione standard di Next.js
 * App Router (non un sistema nuovo): cattura solo gli errori del
 * segmento /dashboard, il resto dell'app (login) resta raggiungibile.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <div className="mb-10 flex items-center justify-center gap-2">
          <span className="bg-primary size-2 rounded-full" />
          <span className="font-heading text-lg font-semibold">
            <span className="text-muted-foreground font-normal">Daily</span>Hub
          </span>
        </div>

        <h1 className="font-heading text-2xl font-medium tracking-tight text-balance">
          Qualcosa non ha funzionato
        </h1>
        <p className="text-muted-foreground mt-3 text-sm">
          Non riesco a caricare la dashboard adesso. Riprova tra poco — se il
          problema continua, i tuoi dati restano al sicuro, nessuna modifica va
          persa.
        </p>

        <Button onClick={reset} size="lg" className="mt-8 w-full">
          Riprova
        </Button>
      </div>
    </main>
  )
}
