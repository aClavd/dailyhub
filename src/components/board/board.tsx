"use client"

import { useState } from "react"

import {
  CELL_MAX_REM,
  CELL_MIN_REM,
  DND_MIME,
  boardNaturalWidthRem,
  boardUsedCols,
  isLibraryWidget,
} from "@/lib/board"
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
  const { layout, addWidget, isDraggingWidget } = useBoard()
  // dragOver: il cursore è ESATTAMENTE sopra la zona in questo momento (dà
  // il riempimento pieno, il feedback "forte"). isDraggingWidget (dal
  // context, acceso da rail.tsx al dragstart) è vero per tutta la durata
  // del trascinamento, indipendentemente da dove si trova il cursore — dà
  // il contorno tratteggiato "qui puoi rilasciare", visibile fin da subito
  // invece di scoprirlo solo passandoci sopra per caso.
  const [dragOver, setDragOver] = useState(false)
  // Impegni/Mail: lo slot arriva sempre da page.tsx (il fetch server-side
  // gira comunque), ma va montato lato client SOLO in un posto — qui dentro
  // la griglia se il blocco è sulla board, altrimenti nascosto più sotto
  // (mai i due insieme) — così AgendaNotifier e il segnale "mail recente"
  // continuano a funzionare anche col blocco tolto dalla board.
  const hasAgenda = layout.some((p) => p.type === "agenda")
  const hasMail = layout.some((p) => p.type === "mail")

  // Colonne davvero usate dai blocchi presenti, non un tetto massimo fisso:
  // con pochi blocchi la griglia resta stretta; crescendo si allarga fino a
  // BOARD_COLS. boardUsedCols/boardNaturalWidthRem sono condivise con
  // dashboard-header.tsx, che le usa per allineare Meteo/Spotify agli stessi
  // bordi di questa griglia.
  const usedCols = boardUsedCols(layout)
  // min(naturale, 100%) sotto è quello che tiene fede a "sempre un unico
  // rettangolo": se la finestra è più stretta della larghezza naturale, le
  // colonne si restringono tutte insieme (proporzionalmente, via
  // minmax(CELL_MIN_REM, CELL_MAX_REM) sotto) per continuare a stare dentro
  // il rettangolo disponibile. CELL_MIN_REM è dove ci si ferma di
  // restringersi — sotto diventerebbe illeggibile (orari/testo tagliati);
  // da lì in giù subentra overflow-x-auto come rete di sicurezza, non lo
  // scroll come prima via d'uscita.
  const naturalWidth = `${boardNaturalWidthRem(layout)}rem`

  return (
    <div>
      {/* I gestori del drop stanno qui, sul contenitore ESTERNO (larghezza
          piena), non sulla griglia stretta sotto — quella è larga solo
          quanto i blocchi già presenti (naturalWidth), spesso molto meno
          dello spazio visivamente disponibile: rilasciare "vicino" alla
          griglia ma fuori da quel riquadro stretto oggi non faceva niente.
          Qui invece tutta l'area conta, il blocco va comunque nel primo
          posto libero (findFreeSpot, invariato). overflow-x-auto resta
          anche come rete di sicurezza per quando le colonne sono già al
          minimo e non c'è altro modo di stare nello spazio disponibile. */}
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
          "overflow-x-auto rounded-xl p-2 transition-colors",
          isDraggingWidget && "outline-primary outline-2 outline-dashed outline-offset-[-6px]",
          dragOver && "bg-brand-soft/60",
        )}
      >
        <div
          style={{
            gridTemplateColumns: `repeat(${usedCols}, minmax(${CELL_MIN_REM}rem, ${CELL_MAX_REM}rem))`,
            width: `min(100%, ${naturalWidth})`,
          }}
          className={cn(
            // Griglia logica: ogni blocco ha una posizione/dimensione esplicita
            // (x/y/w/h in celle, vedi board-context.tsx) applicata come
            // grid-column/grid-row inline su ogni WidgetShell — non più un
            // impacchettamento automatico del browser. minmax(...) sulle
            // colonne + width qui sopra: la griglia è larga quanto le
            // serve se c'è posto, altrimenti tutte le colonne si stringono
            // insieme (fino a 8rem) per restare dentro lo spazio disponibile.
            // relative: durante un resize il blocco trascinato esce dal
            // flusso della griglia (position: absolute) per seguire il
            // mouse pixel per pixel — deve ancorarsi a questo contenitore,
            // non alla pagina (vedi widget-shell.tsx).
            "board-grid relative grid auto-rows-[12rem] gap-4 sm:mx-auto",
          )}
        >
          {layout.map(({ type }) => {
            if (type === "agenda") {
              return (
                <WidgetShell key={type} type="agenda">
                  {agendaSlot}
                </WidgetShell>
              )
            }
            if (type === "mail") {
              return (
                <WidgetShell key={type} type="mail">
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

      {/* Impegni/Mail restano montati anche quando non sono sulla board —
          altrimenti AgendaNotifier e il segnale "mail recente" nel rail
          smetterebbero di funzionare col blocco tolto (vedi hasAgenda/
          hasMail sopra). Zero spazio, zero impatto visivo. */}
      {!hasAgenda && <div className="hidden">{agendaSlot}</div>}
      {!hasMail && <div className="hidden">{mailSlot}</div>}

      {/* Non più un widget finto dentro la griglia: è una didascalia sotto —
          il feedback vero durante il trascinamento è il contorno tratteggiato
          su tutta l'area sopra (isDraggingWidget), acceso già dal momento in
          cui si solleva il blocco dal rail, non solo passandoci sopra. */}
      <p className="text-ink-faint mt-4 text-center text-[0.7rem]">
        Aggiungi altri blocchi trascinandoli dalla libreria a sinistra, o toccali.
      </p>
    </div>
  )
}
