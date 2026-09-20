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
        {/* Product Polish v1 — issue #1: a "w-16" (64px) un valore a 3
            cifre ("503") veniva tagliato dal proprio input, anche a
            widget pieno-larghezza mobile: px-3 (24px) + bordo (2px) +
            le frecce native dello spinner (~16-20px in Chrome/Safari)
            lasciavano troppo poco spazio al testo. Soluzione minima:
            "w-20" (80px, +16px, resta compatto) e spinner nativo
            disabilitato (appearance-none + regola dedicata in
            globals.css per Firefox) — la cifra recupera lo spazio che
            le frecce occupavano, senza perdere alcuna funzionalità
            (i pulsanti ± non facevano altro che +1/-1, poco utili per
            un numero di pagina che si scrive quasi sempre a mano). */}
        <input
          type="number"
          min={0}
          aria-label="Pagina attuale"
          className={cn(inputClass, "no-spinner w-20 py-1.5 text-center")}
          value={current.pagina || ""}
          onChange={(event) => handleChange({ ...current, pagina: toInt(event.target.value) })}
          disabled={book === null}
        />
        <span className="text-ink-faint">/</span>
        <input
          type="number"
          min={0}
          aria-label="Pagine totali"
          className={cn(inputClass, "no-spinner w-20 py-1.5 text-center")}
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
