"use client"

import { useEffect, useRef, useState } from "react"

import { fetchLettura, saveLettura } from "@/lib/actions/lettura"
import type { LetturaState } from "@/lib/queries/lettura"
import { cn } from "@/lib/utils"

import { inputClass } from "./_shared"

const SAVE_DELAY_MS = 600
const EMPTY: LetturaState = { titolo: "", pagina: 0, totale: 0 }

/** Contenuto del blocco Lettura — si autoalimenta al mount, salva con
 * debounce, stesso schema di note-widget.tsx (che vedi per i commenti
 * generali sul perché). */
export function LetturaWidget() {
  const [book, setBook] = useState<LetturaState | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    void fetchLettura().then(setBook)
  }, [])

  function handleChange(next: LetturaState) {
    setBook(next)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => void saveLettura(next), SAVE_DELAY_MS)
  }

  const current = book ?? EMPTY
  const pct =
    current.totale > 0
      ? Math.min(100, Math.round((current.pagina / current.totale) * 100))
      : 0
  const toInt = (value: string) => Math.max(0, Number.parseInt(value, 10) || 0)

  return (
    <div className="flex flex-col gap-2">
      <input
        className={inputClass}
        value={current.titolo}
        onChange={(event) => handleChange({ ...current, titolo: event.target.value })}
        placeholder="Titolo — Autore"
        disabled={book === null}
      />
      <div className="flex items-center gap-2 text-sm">
        <input
          type="number"
          min={0}
          aria-label="Pagina attuale"
          className={cn(inputClass, "w-16 py-1.5 text-center")}
          value={current.pagina || ""}
          onChange={(event) => handleChange({ ...current, pagina: toInt(event.target.value) })}
          disabled={book === null}
        />
        <span className="text-ink-faint">/</span>
        <input
          type="number"
          min={0}
          aria-label="Pagine totali"
          className={cn(inputClass, "w-16 py-1.5 text-center")}
          value={current.totale || ""}
          onChange={(event) => handleChange({ ...current, totale: toInt(event.target.value) })}
          disabled={book === null}
        />
        <span className="text-ink-faint ml-auto font-mono text-xs tabular-nums">{pct}%</span>
      </div>
      <div className="bg-muted h-1 overflow-hidden rounded-full">
        <div className="bg-primary h-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
