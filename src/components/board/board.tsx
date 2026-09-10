"use client"

import { useState } from "react"

import { DND_MIME, isLibraryWidget } from "@/lib/board"
import { cn } from "@/lib/utils"

import { useBoard } from "./board-context"
import { LibraryWidget } from "./library-widget"
import { WidgetShell } from "./widget-shell"

export function Board({
  agendaSlot,
  mailSlot,
}: {
  agendaSlot: React.ReactNode
  mailSlot: React.ReactNode
}) {
  const { layout, addWidget } = useBoard()
  const [dragOver, setDragOver] = useState(false)

  return (
    <div
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes(DND_MIME)) {
          event.preventDefault()
          event.dataTransfer.dropEffect = "copy"
          setDragOver(true)
        }
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          setDragOver(false)
        }
      }}
      onDrop={(event) => {
        event.preventDefault()
        setDragOver(false)
        const type = event.dataTransfer.getData(DND_MIME)
        if (isLibraryWidget(type)) addWidget(type)
      }}
      className={cn(
        "grid grid-cols-1 gap-4 rounded-xl transition-[outline-color] sm:grid-cols-2 xl:grid-cols-3",
        dragOver && "outline-primary outline-2 outline-dashed outline-offset-8",
      )}
    >
      <WidgetShell type="agenda" fixed>
        {agendaSlot}
      </WidgetShell>
      <WidgetShell type="mail" fixed>
        {mailSlot}
      </WidgetShell>

      {layout.map((type) => (
        <WidgetShell key={type} type={type}>
          <LibraryWidget type={type} />
        </WidgetShell>
      ))}

      <p className="border-border text-ink-faint flex min-h-28 items-center justify-center rounded-xl border border-dashed p-4 text-center text-xs sm:col-span-2 xl:col-span-1">
        Trascina un blocco dalla libreria — oppure toccalo
      </p>
    </div>
  )
}
