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
  const { order, addWidget } = useBoard()
  const [dragOver, setDragOver] = useState(false)

  return (
    <div
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes(DND_MIME)) return
        event.preventDefault()
        event.dataTransfer.dropEffect = "copy"
        setDragOver(true)
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          setDragOver(false)
        }
      }}
      onDrop={(event) => {
        if (!event.dataTransfer.types.includes(DND_MIME)) return
        event.preventDefault()
        setDragOver(false)
        const type = event.dataTransfer.getData(DND_MIME)
        if (isLibraryWidget(type)) addWidget(type)
      }}
      className={cn(
        // Griglia a tile in stile Control Center: celle di base fisse che si
        // moltiplicano in base allo spazio disponibile (auto-fill) e un
        // impacchettamento "dense" che chiude i buchi quando un blocco è più
        // piccolo di quello sopra. Su mobile diventa una colonna semplice.
        "grid grid-cols-1 gap-4 rounded-xl transition-[outline-color] sm:grid-flow-dense sm:auto-rows-[12rem] sm:grid-cols-[repeat(auto-fill,minmax(11rem,15rem))]",
        dragOver && "outline-primary outline-2 outline-dashed outline-offset-8",
      )}
    >
      {order.map((type) => {
        if (type === "agenda") {
          return (
            <WidgetShell key={type} type="agenda" fixed>
              {agendaSlot}
            </WidgetShell>
          )
        }
        if (type === "mail") {
          return (
            <WidgetShell key={type} type="mail" fixed>
              {mailSlot}
            </WidgetShell>
          )
        }
        return (
          <WidgetShell key={type} type={type}>
            <LibraryWidget type={type} />
          </WidgetShell>
        )
      })}

      <p className="border-border text-ink-faint flex min-h-28 items-center justify-center rounded-xl border border-dashed p-3 text-center text-[0.7rem] leading-snug sm:h-full">
        Trascina un blocco dalla libreria — oppure toccalo
      </p>
    </div>
  )
}
