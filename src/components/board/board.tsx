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
  diarioSlot,
}: {
  agendaSlot: React.ReactNode
  mailSlot: React.ReactNode
  diarioSlot: React.ReactNode
}) {
  const { layout, addWidget } = useBoard()
  const [dragOver, setDragOver] = useState(false)

  // Colonne davvero usate dai blocchi presenti, non un tetto massimo fisso:
  // con pochi blocchi la griglia (e quindi la board, centrata dal genitore
  // con mx-auto/w-fit) resta stretta; crescendo si allarga fino a BOARD_COLS.
  const usedCols = Math.max(1, ...layout.map((p) => p.x + p.w))

  return (
    <div>
      {/* Con posizioni esplicite (x/y/w/h) la griglia non si restringe più
          da sola per stare nello spazio disponibile, a differenza di prima
          (auto-fit): se i blocchi usano più colonne di quante ce ne stiano
          nella finestra, l'alternativa a "spingere fuori tutta la pagina"
          è farla scorrere solo qui, in orizzontale. */}
      <div className="overflow-x-auto">
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
          style={{ gridTemplateColumns: `repeat(${usedCols}, 15rem)` }}
          className={cn(
            // Griglia logica: ogni blocco ha una posizione/dimensione esplicita
            // (x/y/w/h in celle, vedi board-context.tsx) applicata come
            // grid-column/grid-row inline su ogni WidgetShell — non più un
            // impacchettamento automatico del browser. Il numero di colonne
            // qui sopra viene dai dati stessi (usedCols), quindi la griglia
            // ha sempre esattamente la larghezza che le serve: niente più
            // trucchi auto-fit/max-width, il centraggio (mx-auto sul
            // genitore) funziona perché la larghezza è già quella giusta.
            "board-grid grid auto-rows-[12rem] gap-4 rounded-xl transition-[outline-color]",
            "sm:mx-auto sm:w-fit sm:max-w-[1400px]",
            dragOver && "outline-primary outline-2 outline-dashed outline-offset-8",
          )}
        >
          {layout.map(({ type }) => {
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
            if (type === "diario") {
              return (
                <WidgetShell key={type} type="diario">
                  {diarioSlot}
                </WidgetShell>
              )
            }
            return (
              <WidgetShell key={type} type={type}>
                <LibraryWidget type={type} />
              </WidgetShell>
            )
          })}
        </div>
      </div>

      {/* Non più un widget finto dentro la griglia: è una didascalia sotto —
          il feedback vero durante il trascinamento è il contorno tratteggiato
          sulla griglia stessa (dragOver, sopra). */}
      <p className="text-ink-faint mt-4 text-center text-[0.7rem]">
        Aggiungi altri blocchi trascinandoli dalla libreria a sinistra, o toccali.
      </p>
    </div>
  )
}
