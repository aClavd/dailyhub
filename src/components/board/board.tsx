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
  pomodoroSlot,
}: {
  agendaSlot: React.ReactNode
  mailSlot: React.ReactNode
  diarioSlot: React.ReactNode
  pomodoroSlot: React.ReactNode
}) {
  const { layout, addWidget } = useBoard()
  const [dragOver, setDragOver] = useState(false)

  // Colonne davvero usate dai blocchi presenti, non un tetto massimo fisso:
  // con pochi blocchi la griglia resta stretta; crescendo si allarga fino a
  // BOARD_COLS.
  const usedCols = Math.max(1, ...layout.map((p) => p.x + p.w))
  // Larghezza "naturale" (tutte le colonne a 15rem piene) — è quella che la
  // board userebbe se ci stesse comoda. min(naturale, 100%) sotto è quello
  // che tiene fede a "sempre un unico rettangolo": se la finestra è più
  // stretta della larghezza naturale, le colonne si restringono tutte
  // insieme (proporzionalmente, via minmax(8rem, 15rem) sotto) per
  // continuare a stare dentro il rettangolo disponibile. Il minimo di 8rem
  // è dove ci si ferma di restringersi — sotto diventerebbe illeggibile
  // (orari/testo tagliati); da lì in giù subentra overflow-x-auto come
  // rete di sicurezza, non lo scroll come prima via d'uscita.
  const naturalWidth = `${usedCols * 15 + (usedCols - 1)}rem`

  return (
    <div>
      {/* overflow-x-auto resta come rete di sicurezza (es. troppi blocchi
          già al loro minimo perché nessuno può restringersi oltre) — nel
          caso normale le colonne si restringono prima di arrivarci. */}
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
          style={{
            gridTemplateColumns: `repeat(${usedCols}, minmax(8rem, 15rem))`,
            width: `min(100%, ${naturalWidth})`,
          }}
          className={cn(
            // Griglia logica: ogni blocco ha una posizione/dimensione esplicita
            // (x/y/w/h in celle, vedi board-context.tsx) applicata come
            // grid-column/grid-row inline su ogni WidgetShell — non più un
            // impacchettamento automatico del browser. minmax(8rem, 15rem)
            // sulle colonne + width qui sopra: la griglia è larga quanto le
            // serve se c'è posto, altrimenti tutte le colonne si stringono
            // insieme (fino a 8rem) per restare dentro lo spazio disponibile.
            // relative: durante un resize il blocco trascinato esce dal
            // flusso della griglia (position: absolute) per seguire il
            // mouse pixel per pixel — deve ancorarsi a questo contenitore,
            // non alla pagina (vedi widget-shell.tsx).
            "board-grid relative grid auto-rows-[12rem] gap-4 rounded-xl transition-[outline-color] sm:mx-auto",
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
            if (type === "pomodoro") {
              return (
                <WidgetShell key={type} type="pomodoro">
                  {pomodoroSlot}
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
