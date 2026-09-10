"use client"

import { useCallback, useSyncExternalStore } from "react"

const STORAGE_KEY = "dailyhub:today-focus"

/**
 * Banner "Oggi conta questo". In Fase 1 il valore vive solo in localStorage;
 * dalla Fase 2 andrà sul DB insieme al layout della board.
 */
export function TodayFocus() {
  const value = useSyncExternalStore(subscribe, readValue, () => "")

  const onChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      try {
        localStorage.setItem(STORAGE_KEY, event.target.value)
      } catch {
        /* localStorage non disponibile: si perde la persistenza, non l'input */
      }
      // L'evento "storage" non scatta nella tab che scrive: lo forziamo.
      window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }))
    },
    [],
  )

  return (
    <div className="mx-auto flex max-w-xl items-center gap-3 rounded-xl border border-l-2 border-l-primary bg-brand-soft px-4 py-3 shadow-sm">
      <span className="shrink-0 text-[0.62rem] font-bold tracking-[0.14em] text-primary uppercase">
        Oggi conta questo
      </span>
      <input
        aria-label="La cosa importante di oggi"
        value={value}
        onChange={onChange}
        placeholder="Scrivi la cosa che conta…"
        className="font-heading min-w-0 flex-1 border-0 bg-transparent text-[0.95rem] font-medium text-foreground outline-none placeholder:font-sans placeholder:font-normal placeholder:text-ink-faint"
      />
    </div>
  )
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange)
  return () => window.removeEventListener("storage", onStoreChange)
}

function readValue() {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? ""
  } catch {
    return ""
  }
}
