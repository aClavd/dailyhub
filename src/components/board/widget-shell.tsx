"use client"

import { useState } from "react"

import { REORDER_MIME, WIDGET_META, type WidgetSize, type WidgetType } from "@/lib/board"
import { cn } from "@/lib/utils"

import { useBoard } from "./board-context"
import { GripIcon, ResizeIcon } from "./widget-icon"

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
  const { removeWidget, moveWidget, sizeOf, cycleSize } = useBoard()
  const meta = WIDGET_META[type]
  const size = sizeOf(type)
  const [dragOver, setDragOver] = useState(false)

  return (
    <section
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes(REORDER_MIME)) return
        event.preventDefault()
        event.dataTransfer.dropEffect = "move"
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(event) => {
        if (!event.dataTransfer.types.includes(REORDER_MIME)) return
        event.preventDefault()
        setDragOver(false)
        const from = event.dataTransfer.getData(REORDER_MIME)
        if (from) moveWidget(from as WidgetType, type)
      }}
      className={cn(
        // h-full riempie esattamente la cella (o le celle) assegnate dalla
        // griglia della board: la tile ha sempre la stessa dimensione, il
        // contenuto che non ci sta scorre dentro invece di deformarla.
        "bg-card ring-foreground/10 flex h-full min-w-0 flex-col overflow-hidden rounded-xl ring-1 transition-shadow",
        SIZE_CLASS[size],
        dragOver && "ring-primary ring-2",
      )}
    >
      <header className="flex shrink-0 items-center gap-1.5 border-b border-border px-2.5 py-2">
        <button
          type="button"
          draggable
          onDragStart={(event) => {
            event.dataTransfer.setData(REORDER_MIME, type)
            event.dataTransfer.effectAllowed = "move"
          }}
          aria-label={`Sposta ${meta.title}`}
          title="Trascina per spostare"
          className="text-ink-faint hover:bg-muted hover:text-foreground grid size-6 shrink-0 cursor-grab place-items-center rounded-md active:cursor-grabbing"
        >
          <GripIcon className="size-3.5" />
        </button>
        <h3 className="font-heading min-w-0 flex-1 truncate text-sm font-medium">
          {meta.title}
        </h3>
        <button
          type="button"
          onClick={() => cycleSize(type)}
          aria-label={`Ridimensiona ${meta.title} (attuale ${size})`}
          title="Cambia dimensione"
          className="text-ink-faint hover:bg-muted hover:text-foreground grid size-6 shrink-0 place-items-center rounded-md"
        >
          <ResizeIcon className="size-3.5" />
        </button>
        {fixed ? (
          <span className="text-[0.6rem] font-medium tracking-wide text-ink-faint uppercase">
            fisso
          </span>
        ) : (
          <button
            type="button"
            onClick={() => removeWidget(type)}
            aria-label={`Rimuovi ${meta.title}`}
            className="text-ink-faint hover:bg-muted hover:text-foreground -mr-1 grid size-6 shrink-0 place-items-center rounded-md text-base leading-none"
          >
            &times;
          </button>
        )}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
    </section>
  )
}
