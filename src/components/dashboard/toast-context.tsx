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

// Mobile Product Audit v1 (poi Mobile Attention v1): il contenitore era
// ancorato solo in basso (`bottom-4`, nessun `top`) e cresceva verso
// l'alto senza limite — con molti avvisi insieme (caso limite verificato:
// filtro mail molto ampio) può superare l'altezza del viewport, e la
// parte più vecchia della pila resta irraggiungibile (un elemento fixed
// non scorre con la pagina). MAX_VISIBLE: mostra solo i più recenti, una
// riga "+N altre" per il resto — nessuna sorgente/dismiss/auto-dismiss
// cambia, ogni toast scompare comunque da solo dopo AUTO_DISMISS_MS anche
// se non è (più) visibile.
const MAX_VISIBLE = 3

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

  // I più recenti prima (in fondo alla pila, più vicini a dove si guarda):
  // solo quelli davvero mostrati contano per il conteggio "+N altre" —
  // quelli più vecchi restano comunque negli `toasts`, con il proprio
  // timer di scadenza, solo non disegnati.
  const visible = toasts.slice(-MAX_VISIBLE)
  const hiddenCount = Math.max(0, toasts.length - MAX_VISIBLE)

  return (
    <ToastContext.Provider value={pushToast}>
      {children}
      {toasts.length > 0 && (
        <div className="fixed right-4 bottom-4 z-40 flex w-72 flex-col gap-2">
          {hiddenCount > 0 && (
            <p className="text-ink-faint bg-card border-border rounded-md border px-3 py-1.5 text-center text-[0.68rem]">
              +{hiddenCount} {hiddenCount === 1 ? "altro avviso" : "altri avvisi"}
            </p>
          )}
          {visible.map((t, index) => (
            <ToastRow key={t.id} toast={t} index={index} onDismiss={() => removeAfterExit(t.id)} />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  )
}

function ToastRow({
  toast,
  index,
  onDismiss,
}: {
  toast: ToastEntry
  /** Posizione nello stack attualmente a schermo — Motion Language v1:
   * un piccolo stagger (~50ms per posizione, tetto a 100ms) quando più
   * avvisi sono visibili insieme, così non entrano tutti in un blocco
   * unico. Solo un ritardo in più sullo stesso ingresso già esistente,
   * non un secondo sistema. */
  index: number
  onDismiss: () => void
}) {
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
      style={{ transitionDelay: index > 0 ? `${Math.min(index, 2) * 50}ms` : undefined }}
      className={cn(
        "bg-card border-border flex items-start gap-2.5 rounded-xl border p-3 shadow-lg",
        // transition-[opacity,transform] (non transition-all): solo le due
        // proprietà che cambiano davvero, non ogni proprietà animabile.
        "transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none",
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
