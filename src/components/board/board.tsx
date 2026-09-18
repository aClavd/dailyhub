"use client"

import { useState } from "react"

import {
  CELL_MAX_REM,
  CELL_MIN_REM,
  DND_MIME,
  ROW_HEIGHT_REM,
  boardDisplayWidthRem,
  boardNaturalWidthRem,
  boardUsedCols,
  getMobileOrder,
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
  const { layout, addWidget, isDraggingWidget, setIsDraggingWidget, mobileEditMode, toggleMobileEditMode } =
    useBoard()
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
  // Zona di rilascio (il box tratteggiato durante il trascinamento, sotto)
  // — boardDisplayWidthRem (lib/board.ts) ha già il minimo di 3 colonne:
  // senza, con una board vuota o quasi il box si stringeva alla larghezza
  // naturale (anche solo 1 colonna) mentre i gestori del drop restavano su
  // tutto il contenitore esterno, un riquadro enorme e vuoto invece di uno
  // proporzionato. Stessa funzione usata da header-flanking-row.tsx, così
  // la board e la riga Meteo/saluto/Spotify restano sempre allineate.
  const dropZoneWidth = `${boardDisplayWidthRem(layout)}rem`

  // Mobile Interaction v1, sez. accessibilità — l'ordine nel DOM ora segue
  // SEMPRE lo stesso criterio già usato per la composizione mobile
  // (getMobileOrder: y, poi x, poi indice originale come tie-breaker),
  // non l'ordine grezzo dell'array salvato (che dopo un trascinamento
  // desktop può disallinearsi dalla posizione visiva — moveWidget scambia
  // solo x/y/w/h, non la posizione nell'array). Prima la sequenza visiva
  // sotto i 1024px veniva forzata via CSS `order`, disallineando tab/
  // screen reader dall'ordine a schermo; ordinando qui l'array PRIMA di
  // renderizzarlo, DOM e visuale coincidono sempre — su desktop non
  // cambia nulla (lì la posizione è comunque esplicita via grid-column/
  // row-start, non dall'ordine di lettura), su mobile/tablet risolve il
  // problema alla radice invece di doverlo compensare con `order` in CSS
  // (rimosso da globals.css: non serve più, l'auto-posizionamento della
  // griglia segue già l'ordine nel DOM quando *-start è "auto").
  const mobileOrder = getMobileOrder(layout)
  const orderedLayout = [...layout].sort(
    (a, b) => (mobileOrder.get(a.type) ?? 0) - (mobileOrder.get(b.type) ?? 0),
  )

  return (
    <div>
      {/* "Modifica layout" (Mobile Interaction v1) — solo sotto i 1024px
          (`lg:hidden`): a desktop le maniglie di riordino/ridimensionamento
          sono già sempre attive (mouse, hover per scoprirle), qui invece
          l'unico scopo è non affollare ogni header con le maniglie ▲▼ di
          riordino mobile quando non si sta riorganizzando davvero — resize
          e rimozione restano sempre attivi, con o senza questa modalità.
          Nessuna nuova pagina/vista: un interruttore locale (mobileEditMode,
          board-context.tsx), non persistito. */}
      {layout.length > 0 && (
        <div className="mb-3 flex justify-end lg:hidden">
          <button
            type="button"
            onClick={toggleMobileEditMode}
            aria-pressed={mobileEditMode}
            className={cn(
              "border-border text-ink-soft hover:text-foreground active:translate-y-px min-h-11 rounded-md border px-3 text-xs font-medium transition-colors",
              mobileEditMode && "bg-brand-soft text-primary border-transparent",
            )}
          >
            {mobileEditMode ? "Fatto" : "Modifica layout"}
          </button>
        </div>
      )}

      {/* I gestori del drop stanno qui, sul contenitore ESTERNO (largo
          dropZoneWidth, sopra — almeno 3 colonne, non la sola naturalWidth
          della griglia sotto), non sulla griglia stretta — quella con pochi
          blocchi può essere molto più piccola dello spazio visivamente
          disponibile: rilasciare "vicino" alla griglia ma fuori da quel
          riquadro stretto oggi non faceva niente. Qui invece tutta l'area
          del box tratteggiato conta, il blocco va comunque nel primo posto
          libero (findFreeSpot, invariato). overflow-x-auto resta anche come
          rete di sicurezza per quando le colonne sono già al minimo. */}
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
          // Non aspetta il dragend sul rail (rete di sicurezza in più, non
          // l'unico posto che spegne l'indicatore — vedi rail.tsx): un
          // rilascio riuscito è già di per sé la fine del trascinamento.
          setIsDraggingWidget(false)
          const type = event.dataTransfer.getData(DND_MIME)
          if (isLibraryWidget(type)) addWidget(type)
        }}
        style={{ width: `min(100%, ${dropZoneWidth})` }}
        className={cn(
          // min-h-[14.5rem] (ROW_HEIGHT_REM, la stessa unità di
          // gridAutoRows sulla griglia sotto): con la board vuota o quasi
          // la griglia non ha righe, quindi zero altezza — senza questo
          // minimo il box tratteggiato sarebbe una striscia di ~16px,
          // difficile perfino da vedere. Con più blocchi (già oltre
          // ROW_HEIGHT_REM) non cambia niente.
          "min-h-[14.5rem] overflow-x-auto rounded-xl p-2 transition-colors sm:mx-auto",
          isDraggingWidget && "outline-primary outline-2 outline-dashed outline-offset-[-6px]",
          dragOver && "bg-brand-soft/60",
        )}
      >
        <div
          style={{
            gridTemplateColumns: `repeat(${usedCols}, minmax(${CELL_MIN_REM}rem, ${CELL_MAX_REM}rem))`,
            gridAutoRows: `${ROW_HEIGHT_REM}rem`,
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
            // gridAutoRows in style, non una classe auto-rows-[...]
            // statica: dipende da ROW_HEIGHT_REM (Visual Calibration v2),
            // stesso motivo per cui gridTemplateColumns è già in style.
            // relative: durante un resize il blocco trascinato esce dal
            // flusso della griglia (position: absolute) per seguire il
            // mouse pixel per pixel — deve ancorarsi a questo contenitore,
            // non alla pagina (vedi widget-shell.tsx).
            "board-grid relative grid gap-4 sm:mx-auto",
          )}
        >
          {orderedLayout.map(({ type }) => {
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

      {/* Non un widget finto dentro la griglia: è una didascalia sotto — il
          feedback vero durante il trascinamento è il contorno tratteggiato
          su tutta l'area sopra (isDraggingWidget), acceso già dal momento
          in cui si solleva il blocco dal rail, non solo passandoci sopra.
          Visual Calibration v2: solo a board vuota — con blocchi già
          presenti il messaggio era pura ridondanza (chi ha già usato il
          board sa come funziona) e contribuiva alla sensazione di "tela
          non finita" anche a board popolata. Ancora più discreto
          (text-[0.62rem], opacity ridotta) dove resta: qui è davvero
          l'unica indicazione di come iniziare, non va tolto, solo
          abbassato di peso. */}
      {layout.length === 0 && (
        <p className="text-ink-faint/70 mt-6 text-center text-[0.62rem]">
          Aggiungi blocchi trascinandoli dalla libreria a sinistra, o toccali.
        </p>
      )}
    </div>
  )
}
