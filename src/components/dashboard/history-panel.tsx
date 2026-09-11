"use client"

import { chiaveGiorno, dataBreve } from "@/lib/datetime"
import { DIARIO_EMPTY, diarioKey, type DiarioState } from "@/lib/diario"
import { useLocalStorage } from "@/lib/use-local-storage"
import { cn } from "@/lib/utils"

const DAYS = 7

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

/**
 * Ricapitolo degli ultimi giorni, letto dal diario salvato in locale.
 * Serve a riprendere il filo — obiettivi e umore dei giorni passati —
 * finché non c'è il DB per recap veri (Fase 2, dopo Supabase).
 */
export function HistoryPanel() {
  const days = Array.from({ length: DAYS }, (_, i) => daysAgo(i))

  return (
    <aside className="bg-card ring-foreground/10 flex w-full flex-col rounded-xl ring-1 xl:sticky xl:top-4 xl:w-72 xl:shrink-0">
      <header className="border-b border-border px-4 py-2.5">
        <h3 className="font-heading text-sm font-medium">Cronologia</h3>
        <p className="text-ink-faint mt-0.5 text-[0.68rem]">Gli ultimi 7 giorni di diario</p>
      </header>
      <div className="flex flex-col divide-y divide-border px-4">
        {days.map((date) => (
          <HistoryDay key={chiaveGiorno(date)} date={date} />
        ))}
      </div>
    </aside>
  )
}

function HistoryDay({ date }: { date: Date }) {
  const [entry] = useLocalStorage<DiarioState>(diarioKey(date), DIARIO_EMPTY)
  const today = chiaveGiorno(date) === chiaveGiorno()
  const summary = entry.obiettivo || entry.testo

  return (
    <div className="py-2.5">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "size-1.5 shrink-0 rounded-full",
            entry.mood === "Difficile" && "bg-destructive",
            (entry.mood === "Così così" || entry.mood === "Neutro") && "bg-ink-faint",
            (entry.mood === "Buono" || entry.mood === "Ottimo") && "bg-good",
            !entry.mood && "bg-border",
          )}
        />
        <span className="font-mono text-[0.68rem] tracking-wide text-ink-soft uppercase">
          {dataBreve(date)}
        </span>
        {today && (
          <span className="text-primary ml-auto text-[0.6rem] font-semibold tracking-wide uppercase">
            oggi
          </span>
        )}
      </div>
      <p
        className={cn(
          "mt-1 truncate text-xs",
          summary ? "text-ink-soft" : "text-ink-faint italic",
        )}
      >
        {summary || "Nessuna voce"}
      </p>
    </div>
  )
}
