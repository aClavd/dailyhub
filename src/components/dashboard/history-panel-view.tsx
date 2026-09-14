"use client"

import type { SVGProps } from "react"

import { Dialog, DialogTrigger } from "@/components/ui/dialog"
import type { DiarioState } from "@/lib/diario"
import { moodDotClass } from "@/lib/diario"
import { useLocalStorage } from "@/lib/use-local-storage"
import { cn } from "@/lib/utils"

import { HistoryExplorer } from "./history-explorer"

export type HistoryDayData = {
  key: string
  /** Es. "mer 10". */
  label: string
  dayNumber: number
  isToday: boolean
  entry?: DiarioState
}

function HistoryIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l3 2M9 3h6" />
    </svg>
  )
}

function ExpandIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M9 3H4v5M15 3h5v5M15 21h5v-5M9 21H4v-5" />
    </svg>
  )
}

/**
 * Cronologia degli ultimi giorni — un pannello comprimibile sulla destra,
 * simmetrico al rail: aperto mostra la lista, chiuso una mini colonna
 * "calendario" (numero del giorno + pallino umore).
 */
export function HistoryPanelView({
  days,
  todayKey,
}: {
  days: HistoryDayData[]
  todayKey: string
}) {
  const [collapsed, setCollapsed] = useLocalStorage<boolean>("dailyhub:history-collapsed", false)

  return (
    <aside
      className={cn(
        // Simmetrico al rail di sinistra: nascosto sotto lg, poi a tutta
        // altezza e agganciato, larghezza fissa comprimibile a icone.
        "hidden shrink-0 flex-col border-l border-border bg-card transition-[width] duration-150 lg:sticky lg:top-0 lg:flex lg:h-screen",
        collapsed ? "w-[52px]" : "w-72",
      )}
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-3.5">
        {collapsed ? (
          <HistoryIcon className="text-ink-faint mx-auto size-4" />
        ) : (
          <div className="min-w-0 flex-1">
            <h3 className="font-heading text-sm font-medium">Cronologia</h3>
            <p className="text-ink-faint mt-0.5 text-[0.68rem]">Gli ultimi 7 giorni</p>
          </div>
        )}
        {!collapsed && (
          <Dialog>
            <DialogTrigger
              aria-label="Apri calendario e ricerca"
              title="Calendario e ricerca"
              className="border-border bg-card text-ink-soft hover:text-foreground hover:border-ink-faint grid size-6 shrink-0 place-items-center rounded-md border transition-colors"
            >
              <ExpandIcon className="size-3.5" />
            </DialogTrigger>
            <HistoryExplorer todayKey={todayKey} />
          </Dialog>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          aria-label={collapsed ? "Espandi la cronologia" : "Riduci la cronologia"}
          aria-expanded={!collapsed}
          className={cn(
            "border-border bg-card text-ink-soft hover:text-foreground hover:border-ink-faint grid size-6 shrink-0 place-items-center rounded-md border text-sm transition-colors",
            collapsed && "mx-auto",
          )}
        >
          {collapsed ? "‹" : "›"}
        </button>
      </div>

      {collapsed ? (
        <div className="flex min-h-0 flex-1 flex-col items-center gap-1.5 overflow-y-auto px-2 py-3">
          {days.map((day) => (
            <div
              key={day.key}
              title={`${day.label} — ${day.entry?.obiettivo || day.entry?.testo || "nessuna voce"}`}
              className={cn(
                "flex w-full flex-col items-center gap-1 rounded-md py-1.5",
                day.isToday && "bg-brand-soft",
              )}
            >
              <span
                className={cn(
                  "font-mono text-[0.65rem]",
                  day.isToday ? "text-primary font-semibold" : "text-ink-soft",
                )}
              >
                {day.dayNumber}
              </span>
              <span className={cn("size-1.5 rounded-full", moodDotClass(day.entry?.mood))} />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col divide-y divide-border overflow-y-auto px-4">
          {days.map((day) => {
            const summary = day.entry?.obiettivo || day.entry?.testo
            return (
              <div key={day.key} className="py-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className={cn("size-1.5 shrink-0 rounded-full", moodDotClass(day.entry?.mood))}
                  />
                  <span className="font-mono text-[0.68rem] tracking-wide text-ink-soft uppercase">
                    {day.label}
                  </span>
                  {day.isToday && (
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
          })}
        </div>
      )}
    </aside>
  )
}
