"use client"

import { useLocalStorage } from "@/lib/use-local-storage"
import { cn } from "@/lib/utils"

import { inputClass } from "./_shared"

type Lettura = { titolo: string; pagina: number; totale: number }

const EMPTY: Lettura = { titolo: "", pagina: 0, totale: 0 }

export function LetturaWidget() {
  const [stored, setStored] = useLocalStorage<Lettura>("dailyhub:lettura", EMPTY)
  const book = { ...EMPTY, ...stored }
  const pct =
    book.totale > 0
      ? Math.min(100, Math.round((book.pagina / book.totale) * 100))
      : 0
  const toInt = (value: string) => Math.max(0, Number.parseInt(value, 10) || 0)

  return (
    <div className="flex flex-col gap-2">
      <input
        className={inputClass}
        value={book.titolo}
        onChange={(event) => setStored({ ...book, titolo: event.target.value })}
        placeholder="Titolo — Autore"
      />
      <div className="flex items-center gap-2 text-sm">
        <input
          type="number"
          min={0}
          aria-label="Pagina attuale"
          className={cn(inputClass, "w-16 py-1.5 text-center")}
          value={book.pagina || ""}
          onChange={(event) =>
            setStored({ ...book, pagina: toInt(event.target.value) })
          }
        />
        <span className="text-ink-faint">/</span>
        <input
          type="number"
          min={0}
          aria-label="Pagine totali"
          className={cn(inputClass, "w-16 py-1.5 text-center")}
          value={book.totale || ""}
          onChange={(event) =>
            setStored({ ...book, totale: toInt(event.target.value) })
          }
        />
        <span className="text-ink-faint ml-auto font-mono text-xs tabular-nums">
          {pct}%
        </span>
      </div>
      <div className="bg-muted h-1 overflow-hidden rounded-full">
        <div className="bg-primary h-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
