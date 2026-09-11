"use client"

import { WIDGET_META, type WidgetSize, type WidgetType } from "@/lib/board"
import { cn } from "@/lib/utils"

import { useBoard } from "./board-context"

/** Quante celle occupa ogni taglia, in stile Centro di Controllo. */
const SIZE_CLASS: Record<WidgetSize, string> = {
  "1x1": "",
  "2x1": "sm:col-span-2",
  "1x2": "sm:row-span-2",
  "2x2": "sm:col-span-2 sm:row-span-2",
}

export function WidgetShell({
  type,
  fixed = false,
  children,
}: {
  type: WidgetType
  fixed?: boolean
  children: React.ReactNode
}) {
  const { removeWidget } = useBoard()
  const meta = WIDGET_META[type]

  return (
    <section
      className={cn(
        // h-full riempie esattamente la cella (o le celle) assegnate dalla
        // griglia della board: la tile ha sempre la stessa dimensione, il
        // contenuto che non ci sta scorre dentro invece di deformarla.
        "bg-card ring-foreground/10 flex h-full min-w-0 flex-col overflow-hidden rounded-xl ring-1",
        SIZE_CLASS[meta.size],
      )}
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <h3 className="font-heading text-sm font-medium">{meta.title}</h3>
        {fixed ? (
          <span className="text-[0.6rem] font-medium tracking-wide text-ink-faint uppercase">
            fisso
          </span>
        ) : (
          <button
            type="button"
            onClick={() => removeWidget(type)}
            aria-label={`Rimuovi ${meta.title}`}
            className="text-ink-faint hover:bg-muted hover:text-foreground -mr-1.5 grid size-6 place-items-center rounded-md text-base leading-none transition-colors"
          >
            &times;
          </button>
        )}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
    </section>
  )
}
