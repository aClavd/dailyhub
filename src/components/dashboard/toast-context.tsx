"use client"

import { createContext, useCallback, useContext, useState } from "react"

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

const AUTO_DISMISS_MS = 20_000

const ToastContext = createContext<((toast: ToastInput) => void) | null>(null)

/**
 * Un solo posto in basso a destra per tutti gli avvisi della dashboard
 * (impegni imminenti, promemoria diario, altri in futuro) — senza questo,
 * ogni sorgente avrebbe il proprio angolo fisso e si sovrapporrebbero.
 * `pushToast` (via useToast) è idempotente sullo stesso id: chi lo chiama
 * da un controllo periodico può farlo più volte senza duplicare l'avviso.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastInput[]>([])

  const pushToast = useCallback((toast: ToastInput) => {
    setToasts((prev) => {
      if (prev.some((t) => t.id === toast.id)) return prev
      return [...prev, toast]
    })
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id))
    }, AUTO_DISMISS_MS)
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={pushToast}>
      {children}
      {toasts.length > 0 && (
        <div className="fixed right-4 bottom-4 z-40 flex w-72 flex-col gap-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="bg-card border-border flex items-start gap-2.5 rounded-xl border p-3 shadow-lg"
            >
              <span
                className={cn(
                  "mt-1.5 size-1.5 shrink-0 rounded-full",
                  t.accent === "urgente" ? "bg-destructive" : "bg-primary",
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{t.title}</p>
                <p className="text-ink-faint mt-0.5 text-xs">{t.label}</p>
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Chiudi avviso"
                className="text-ink-faint hover:text-foreground shrink-0 text-sm leading-none"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast(): (toast: ToastInput) => void {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast va usato dentro <ToastProvider>")
  return ctx
}
