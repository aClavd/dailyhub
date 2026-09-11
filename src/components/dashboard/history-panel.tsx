import { chiaveGiorno, dataBreve } from "@/lib/datetime"
import type { DiarioState } from "@/lib/diario"
import { getDiarioHistory } from "@/lib/queries/diario"
import { cn } from "@/lib/utils"

const DAYS = 7

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

/**
 * Ricapitolo degli ultimi giorni, letto dal DB (Server Component). Serve a
 * riprendere il filo — obiettivi e umore dei giorni passati.
 */
export async function HistoryPanel() {
  const days = Array.from({ length: DAYS }, (_, i) => daysAgo(i))
  const keys = days.map((d) => chiaveGiorno(d))
  const history = await getDiarioHistory(keys)

  return (
    <aside className="bg-card ring-foreground/10 flex w-full flex-col rounded-xl ring-1 xl:sticky xl:top-4 xl:w-72 xl:shrink-0">
      <header className="border-b border-border px-4 py-2.5">
        <h3 className="font-heading text-sm font-medium">Cronologia</h3>
        <p className="text-ink-faint mt-0.5 text-[0.68rem]">Gli ultimi 7 giorni di diario</p>
      </header>
      <div className="flex flex-col divide-y divide-border px-4">
        {days.map((date) => {
          const key = chiaveGiorno(date)
          return <HistoryDay key={key} date={date} entry={history[key]} />
        })}
      </div>
    </aside>
  )
}

function HistoryDay({ date, entry }: { date: Date; entry?: DiarioState }) {
  const today = chiaveGiorno(date) === chiaveGiorno()
  const summary = entry?.obiettivo || entry?.testo

  return (
    <div className="py-2.5">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "size-1.5 shrink-0 rounded-full",
            entry?.mood === "Difficile" && "bg-destructive",
            (entry?.mood === "Così così" || entry?.mood === "Neutro") && "bg-ink-faint",
            (entry?.mood === "Buono" || entry?.mood === "Ottimo") && "bg-good",
            !entry?.mood && "bg-border",
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
