"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"

import { cn } from "@/lib/utils"

export type ToastInput = {
  /** Univoco per la cosa che sta notificando (es. id evento, "diario-2026-09-14")
   * — chiamare pushToast due volte con lo stesso id non duplica l'avviso. */
  id: string
  title: string
  label: string
  /** "urgente" = rosso (es. impegno imminente), "attenzione" = ocra (default). */
  accent?: "urgente" | "attenzione"
}

type ToastEntry = ToastInput & { leaving: boolean }

const AUTO_DISMISS_MS = 20_000
// Deve combaciare con la durata di transition-all sotto — il tempo che ci
// vuole perché lo slide+fade di uscita finisca prima di togliere per
// davvero il toast dall'array (altrimenti sparirebbe di scatto a metà).
const EXIT_MS = 200

const ToastContext = createContext<((toast: ToastInput) => void) | null>(null)

/**
 * Un solo posto in basso a destra per tutti gli avvisi della dashboard
 * (impegni imminenti, promemoria diario, altri in futuro) — senza questo,
 * ogni sorgente avrebbe il proprio angolo fisso e si sovrapporrebbero.
 * `pushToast` (via useToast) è idempotente sullo stesso id: chi lo chiama
 * da un controllo periodico può farlo più volte senza duplicare l'avviso.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([])

  // Segna "in uscita" (fa partire la transizione) e solo dopo la tolgo
  // per davvero dall'array — prima spariva di scatto, senza nessuna
  // animazione (Claudio: animazioni per una UX più fluida).
  const removeAfterExit = useCallback((id: string) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)))
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, EXIT_MS)
  }, [])

  const pushToast = useCallback(
    (toast: ToastInput) => {
      setToasts((prev) => {
        if (prev.some((t) => t.id === toast.id)) return prev
        return [...prev, { ...toast, leaving: false }]
      })
      window.setTimeout(() => removeAfterExit(toast.id), AUTO_DISMISS_MS)
    },
    [removeAfterExit],
  )

  return (
    <ToastContext.Provider value={pushToast}>
      {children}
      {toasts.length > 0 && (
        <div className="fixed right-4 bottom-4 z-40 flex w-72 flex-col gap-2">
          {toasts.map((t) => (
            <ToastRow key={t.id} toast={t} onDismiss={() => removeAfterExit(t.id)} />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  )
}

function ToastRow({ toast, onDismiss }: { toast: ToastEntry; onDismiss: () => void }) {
  // Parte "fuori" (traslato+trasparente) e passa a "dentro" un istante dopo
  // il montaggio — nello stesso render andrebbero già uniti in una sola
  // pittura del browser, senza vedere la transizione partire davvero.
  const [entered, setEntered] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div
      className={cn(
        "bg-card border-border flex items-start gap-2.5 rounded-xl border p-3 shadow-lg",
        "transition-all duration-200 ease-out motion-reduce:transition-none",
        entered && !toast.leaving ? "translate-y-0 opacity-100" : "translate-y-1.5 opacity-0",
      )}
    >
      <span
        className={cn(
          "mt-1.5 size-1.5 shrink-0 rounded-full",
          toast.accent === "urgente" ? "bg-destructive" : "bg-primary",
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{toast.title}</p>
        <p className="text-ink-faint mt-0.5 text-xs">{toast.label}</p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Chiudi avviso"
        className="text-ink-faint hover:text-foreground shrink-0 text-sm leading-none"
      >
        &times;
      </button>
    </div>
  )
}

export function useToast(): (toast: ToastInput) => void {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast va usato dentro <ToastProvider>")
  return ctx
}
