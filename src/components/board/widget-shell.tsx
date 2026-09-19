"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"

import { ChevronDown, ChevronUp } from "lucide-react"

import { resizeEdge, type ResizeEdge } from "@/lib/board-resize"
import { getMobileOrder, REORDER_MIME, WIDGET_META, type WidgetType } from "@/lib/board"
import { cn } from "@/lib/utils"

import { useBoard } from "./board-context"
import { GripIcon, ResizeCornerIcon, WidgetIcon } from "./widget-icon"

type LiveRect = { left: number; top: number; width: number; height: number }

/**
 * Livello di rilevanza da segnalare sul blocco — cambia solo il colore
 * della "spina" sul bordo sinistro (vedi sotto): mai la posizione, la
 * dimensione o la visibilità di un widget.
 */
export type WidgetEmphasis = "none" | "attenzione" | "urgente"

type EmphasisReport = { level: WidgetEmphasis; label?: string }

/**
 * Chi disegna la griglia (board.tsx) non ha visibilità sui dati di Agenda/
 * Mail — arrivano come slot già renderizzati, risolti dentro il proprio
 * Suspense (vedi Fase 5.2). Il contenuto di un widget, una volta risolto,
 * "segnala in su" alla propria WidgetShell tramite questo contesto —
 * pattern React standard (figlio → antenato via context + effect), non
 * un canale nuovo inventato ad hoc. Il valore del contesto è il setter di
 * useState: stabile per natura, nessun wrapper che ne romperebbe
 * l'identità da un render all'altro.
 */
const EmphasisContext = createContext<((report: EmphasisReport) => void) | null>(null)

/** Per un widget che è già un Client Component (es. Pomodoro): chiama il
 * setter dentro un effect — un side-effect legittimo verso un antenato,
 * non uno stato derivato nello stesso componente (quello sì vietato dal
 * linter di questo progetto). */
export function useReportEmphasis(level: WidgetEmphasis, label?: string) {
  const report = useContext(EmphasisContext)
  useEffect(() => {
    report?.({ level, label })
  }, [level, label, report])
}

/** Per un widget che resta un Server Component (Agenda/Mail): il livello
 * si calcola lato server con dati già presenti, arriva qui come prop
 * serializzabile, questo componente foglia lo segnala in su. */
export function EmphasisReporter({ level, label }: EmphasisReport) {
  useReportEmphasis(level, label)
  return null
}

export function WidgetShell({
  type,
  emphasis = "none",
  children,
}: {
  type: WidgetType
  emphasis?: WidgetEmphasis
  children: React.ReactNode
}) {
  const {
    committedLayout,
    placementOf,
    setPreview,
    commitLayout,
    removeWidget,
    moveWidget,
    moveMobileOrder,
    mobileEditMode,
    isDraggingReorder,
    setIsDraggingReorder,
    leavingWidgets,
  } = useBoard()
  const meta = WIDGET_META[type]
  const placement = placementOf(type)
  const committedPlacement = committedLayout.find((p) => p.type === type)
  const isLeaving = leavingWidgets.has(type)
  const [dragOver, setDragOver] = useState(false)
  const [justResized, setJustResized] = useState(false)
  // Vero solo al mount, si spegne da solo — Motion Language v1: il
  // blocco appena aggiunto entra con una dissolvenza (widget-enter,
  // globals.css) invece di comparire già "finito". `true` come stato
  // iniziale (non un effect che lo accende): deve poter animare fin dal
  // primissimo render, non un istante dopo.
  const [justAdded, setJustAdded] = useState(true)
  useEffect(() => {
    const id = setTimeout(() => setJustAdded(false), 220)
    return () => clearTimeout(id)
  }, [])
  // Segnalato dal contenuto (una volta risolto) via EmphasisContext — la
  // prop `emphasis` esterna, se mai passata, resta prioritaria.
  const [contentEmphasis, setContentEmphasis] = useState<EmphasisReport>({ level: "none" })
  const effectiveEmphasis = emphasis !== "none" ? emphasis : contentEmphasis.level
  const emphasisLabel = emphasis !== "none" ? undefined : contentEmphasis.label
  // Non nullo solo mentre trascini un bordo: il blocco esce dal flusso della
  // griglia e segue il mouse pixel per pixel (vedi startResize). Il
  // "modello dati" sotto resta comunque a celle, invariato — è solo il
  // livello visivo di questo blocco durante il trascinamento.
  const [liveRect, setLiveRect] = useState<LiveRect | null>(null)
  // x/y qui dentro, non solo w/h: prima l'assestamento scattava solo per un
  // cambio di dimensione, mai per un cambio di sola posizione — un blocco
  // che si sposta per richiudere il buco lasciato da uno eliminato
  // (repackLayout, board-context.tsx) scattava di colpo nel nuovo posto,
  // senza nessuna transizione (Claudio: animazioni per una UX più fluida).
  const prevPlacement = useRef({
    x: committedPlacement?.x,
    y: committedPlacement?.y,
    w: committedPlacement?.w,
    h: committedPlacement?.h,
  })
  const sectionRef = useRef<HTMLElement | null>(null)

  // Breve "assestamento" quando la posizione o la taglia definitiva
  // cambia — sul blocco attivo e su qualunque vicino a cui il
  // resize/repack ha tolto/dato spazio o cambiato posto, non durante il
  // trascinamento (solo quando il valore *committato* cambia).
  useEffect(() => {
    if (!committedPlacement) return
    const prev = prevPlacement.current
    if (
      prev.x !== committedPlacement.x ||
      prev.y !== committedPlacement.y ||
      prev.w !== committedPlacement.w ||
      prev.h !== committedPlacement.h
    ) {
      prevPlacement.current = {
        x: committedPlacement.x,
        y: committedPlacement.y,
        w: committedPlacement.w,
        h: committedPlacement.h,
      }
      setJustResized(true)
      const id = setTimeout(() => setJustResized(false), 220)
      return () => clearTimeout(id)
    }
  }, [committedPlacement])

  // Il blocco è "in anteprima" (attivo o vicino che sta cedendo/riprendendo
  // spazio) quando la sua posizione/dimensione visualizzata differisce da
  // quella committata — evidenzia entrambi i lati del bordo che si muove.
  const resizing =
    placement &&
    committedPlacement &&
    (placement.x !== committedPlacement.x ||
      placement.y !== committedPlacement.y ||
      placement.w !== committedPlacement.w ||
      placement.h !== committedPlacement.h)

  // Si può afferrare da un bordo qualsiasi (sopra, sotto, destra, sinistra)
  // o dall'angolo (i due bordi insieme). Due binari in parallelo:
  // - continuo (liveRect): SOLO questo blocco, segue il mouse pixel per
  //   pixel — è quello che si vede muoversi mentre trascini.
  // - a celle (resizeEdge/setPreview, invariato): pilota il vicino che
  //   cede/riprende spazio e il valore che verrà davvero salvato. resizeEdge
  //   stesso, chiamato con un delta enorme, dice quanto ci si può spingere
  //   in ciascuna direzione (si autolimita già a minimi/massimi/vicini) —
  //   è il confine entro cui il trascinamento continuo resta clampato,
  //   senza dover reimplementare gli stessi vincoli in pixel.
  const startResize = useCallback(
    (edges: ResizeEdge[]) => (event: React.PointerEvent) => {
      event.preventDefault()
      event.stopPropagation()
      const el = sectionRef.current
      const gridEl = el?.closest(".board-grid") as HTMLElement | null
      if (!el || !gridEl || !placement) return
      const startRect = el.getBoundingClientRect()
      const gridRect = gridEl.getBoundingClientRect()
      // Cella reale in questo momento, non un valore fisso: le colonne si
      // restringono insieme quando la finestra è stretta (board.tsx), quindi
      // quanti px vale una cella dipende dallo schermo/finestra attuale.
      const cellW = startRect.width / placement.w
      const cellH = startRect.height / placement.h
      const startX = event.clientX
      const startY = event.clientY
      const startLayout = committedLayout

      const bounds = new Map(
        edges.map((edge) => {
          const horizontal = edge === "left" || edge === "right"
          const startCells = horizontal ? placement.w : placement.h
          const grown = resizeEdge(startLayout, type, edge, 999).find((p) => p.type === type)
          const shrunk = resizeEdge(startLayout, type, edge, -999).find((p) => p.type === type)
          const maxGrowCells = (horizontal ? (grown?.w ?? startCells) : (grown?.h ?? startCells)) - startCells
          const maxShrinkCells = startCells - (horizontal ? (shrunk?.w ?? startCells) : (shrunk?.h ?? startCells))
          return [edge, { maxGrowCells, maxShrinkCells }] as const
        }),
      )

      // Calcolato di nuovo a ogni pointermove/pointerup dalla stessa
      // funzione pura (resizeEdge), non riletto dallo stato React: un
      // listener nativo registrato al pointerdown vede sempre lo stato di
      // quel momento, mai gli aggiornamenti successivi.
      let latest = startLayout

      const onMove = (ev: PointerEvent) => {
        let next = startLayout
        let left = startRect.left - gridRect.left
        let top = startRect.top - gridRect.top
        let width = startRect.width
        let height = startRect.height

        for (const edge of edges) {
          const horizontal = edge === "left" || edge === "right"
          const cellPx = horizontal ? cellW : cellH
          const { maxGrowCells, maxShrinkCells } = bounds.get(edge)!
          const rawSigned = (horizontal ? ev.clientX - startX : ev.clientY - startY) * (edge === "left" || edge === "top" ? -1 : 1)

          // A celle: pilota il modello dati reale (vicino compreso).
          const deltaCells = Math.max(
            -maxShrinkCells,
            Math.min(maxGrowCells, Math.round(rawSigned / cellPx)),
          )
          next = resizeEdge(next, type, edge, deltaCells)

          // A pixel: pilota solo la posizione visiva di questo blocco,
          // clampata agli stessi confini (in px) di quella a celle.
          const clampedPx = Math.max(-maxShrinkCells * cellPx, Math.min(maxGrowCells * cellPx, rawSigned))
          if (horizontal) {
            width += clampedPx
            if (edge === "left") left -= clampedPx
          } else {
            height += clampedPx
            if (edge === "top") top -= clampedPx
          }
        }

        latest = next
        setPreview(next)
        setLiveRect({ left, top, width, height })
      }
      const onUp = () => {
        commitLayout(latest)
        setLiveRect(null)
        window.removeEventListener("pointermove", onMove)
        window.removeEventListener("pointerup", onUp)
      }
      window.addEventListener("pointermove", onMove)
      window.addEventListener("pointerup", onUp, { once: true })
    },
    [committedLayout, placement, type, setPreview, commitLayout],
  )

  if (!placement) return null

  // Mobile Work Composition v1 — derivato SOLO per la composizione sotto
  // i 1536px (soglia dal Responsive Grid Fix 1024-1279px, prima 1024px),
  // mai persistito, ricalcolato a ogni render dallo stesso
  // `committedLayout` già in mano (mai un secondo stato/listener di
  // resize): esposto come custom property CSS, letta solo dentro le
  // media query di globals.css — sul desktop resta dichiarata ma inerte.
  // --tablet-span: quanto delle 2 colonne tablet occupa questo blocco —
  // 2 (piena larghezza) solo se il TIPO ha bisogno di più di una colonna
  // stretta per essere leggibile (stesso WIDGET_META.minW già usato per
  // il ridimensionamento desktop, non un numero nuovo inventato qui).
  const tabletSpan = meta.minW >= 2 ? 2 : 1

  // Mobile Interaction v1 — posizione di questo blocco nell'ordine
  // visivo mobile (getMobileOrder, invariata), solo per disabilitare ▲/▼
  // quando è già all'estremo: l'ordine nel DOM (board.tsx, ordinato allo
  // stesso modo) è quello che decide DAVVERO la sequenza visiva, questo
  // serve solo alle due maniglie qui sotto.
  const mobileOrderMap = getMobileOrder(committedLayout)
  const mobileOrderedTypes = [...committedLayout]
    .sort((a, b) => (mobileOrderMap.get(a.type) ?? 0) - (mobileOrderMap.get(b.type) ?? 0))
    .map((p) => p.type)
  const mobileIndex = mobileOrderedTypes.indexOf(type)
  const isFirstMobile = mobileIndex <= 0
  const isLastMobile = mobileIndex === -1 || mobileIndex >= mobileOrderedTypes.length - 1

  return (
    <>
      {/* Segnaposto tratteggiato nella cella "di atterraggio" (quella a
          celle, sincronizzata col vicino) mentre il blocco vero fluttua
          sopra seguendo il mouse — altrimenti si vedrebbe un buco vuoto
          nella griglia durante il trascinamento. */}
      {liveRect && (
        <div
          aria-hidden
          style={{
            gridColumn: `${placement.x + 1} / span ${placement.w}`,
            gridRow: `${placement.y + 1} / span ${placement.h}`,
          }}
          className="border-border rounded-xl border border-dashed"
        />
      )}
      <section
        ref={sectionRef}
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
        style={
          liveRect
            ? {
                position: "absolute",
                left: liveRect.left,
                top: liveRect.top,
                width: liveRect.width,
                height: liveRect.height,
                zIndex: 30,
              }
            : ({
                // Longhand (start/end), non la scorciatoia gridColumn/gridRow:
                // le media query sotto i 1536px (globals.css) devono poter
                // sovrascrivere SOLO *-start (dove inizia il blocco), senza
                // toccare *-end (lo span, cioè w/h) — un blocco alto 2 righe
                // resta alto 2 righe anche impilato in colonna singola,
                // invece di schiacciarsi a una sola riga come succedeva con
                // la vecchia regola `grid-row: auto !important` (che
                // sovrascriveva l'intera proprietà, span compreso).
                gridColumnStart: placement.x + 1,
                gridColumnEnd: `span ${placement.w}`,
                gridRowStart: placement.y + 1,
                gridRowEnd: `span ${placement.h}`,
                "--tablet-span": tabletSpan,
              } as React.CSSProperties)
        }
        className={cn(
          // h-full riempie esattamente la cella (o le celle) assegnate dalla
          // griglia della board: la tile ha sempre la dimensione del proprio
          // placement, il contenuto che non ci sta scorre dentro invece di
          // deformarla. board-cell: vedi globals.css, sotto sm: forza una
          // colonna piena larghezza (batte questo style inline).
          // overflow-hidden RIMOSSA da qui (Mobile Interaction v1) — ritagliava
          // anche le aree di tocco invisibili estese (after:-inset-*) di
          // rimuovi/sposta/ridimensiona vicino al bordo, rendendole di
          // fatto ancora piccole quanto prima nonostante il CSS corretto
          // (verificato dal vivo: un clic nella zona estesa risultava fuori
          // dal blocco). Il contenuto scrollabile ha già la sua clip
          // (overflow-y-auto sul div sotto); l'unico effetto visibile
          // rimasto è che la spina di rilevanza (bordo sinistro) e le
          // righe di indicazione del resize non sono più ritagliate
          // esattamente sull'angolo arrotondato — impercettibile (3px),
          // preferibile ad aree di tocco rotte.
          "board-cell bg-card ring-foreground/10 relative flex h-full min-w-0 flex-col rounded-xl ring-1",
          (dragOver || resizing) && "ring-primary ring-2",
          // Contorno tratteggiato su OGNI blocco (tranne quello già sotto
          // il cursore, che ha già l'anello pieno sopra) dall'inizio di
          // uno spostamento — non solo al passaggio del mouse: prima
          // l'unico segnale era l'anello sul blocco esatto sotto al
          // cursore in quel momento, niente vista d'insieme di dove si
          // potesse rilasciare (Claudio: "non si capisce... dove posso
          // spostarlo"). Stessa idea già in board.tsx per l'aggiunta
          // dalla Libreria (isDraggingWidget), qui per lo spostamento di
          // un blocco già sulla board (isDraggingReorder).
          isDraggingReorder && !dragOver && "outline-primary/40 outline-2 outline-dashed outline-offset-[-4px]",
          liveRect && "shadow-lg",
          // Motion Language v1 — mutuamente esclusive nel tempo (in uscita
          // batte appena-aggiunto batte assestato, un solo ramo per volta:
          // niente due animazioni che si contendono la stessa proprietà
          // `animation`). In uscita: anche pointer-events-none, sta per
          // sparire, niente interazioni a metà (doppio click sulla ×,
          // drag che parte su un blocco che non ci sarà più).
          isLeaving
            ? "pointer-events-none [animation:widget-exit_220ms_ease-out_forwards] motion-reduce:opacity-0"
            : justAdded
              ? "[animation:widget-enter_220ms_ease-out] motion-reduce:[animation:none]"
              : justResized && "[animation:widget-settle_220ms_ease-out] motion-reduce:[animation:none]",
        )}
      >
        {/* "Spina" sul bordo sinistro — trasparente di default, si accende
            solo quando il contenuto segnala una rilevanza reale (Fase 5.2 —
            evento imminente, mail recente, sessione di studio attiva). Mai
            un cambio di posizione/dimensione, solo colore. rounded-l-xl
            (stesso raggio della sezione, Mobile Interaction v1): prima la
            clippava overflow-hidden del genitore — rimosso per non tagliare
            più le aree di tocco estese dei controlli (grip/rimuovi/angolo di
            ridimensionamento); senza un proprio arrotondamento la barra
            sporgeva a spigolo vivo oltre l'angolo arrotondato della card. */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 z-10 w-[3px] rounded-l-xl transition-colors",
            effectiveEmphasis === "urgente"
              ? "bg-destructive/80"
              : effectiveEmphasis === "attenzione"
                ? "bg-primary/70"
                : "bg-transparent",
          )}
        />
        <header className="flex shrink-0 items-center gap-1.5 border-b border-border px-2.5 py-2">
          <button
            type="button"
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData(REORDER_MIME, type)
              event.dataTransfer.effectAllowed = "move"
              setIsDraggingReorder(true)
            }}
            // Sempre attaccato, non condizionato a nulla — stessa lezione
            // già imparata in questa sessione per rail.tsx: staccarlo in
            // certe condizioni (es. dopo un drop riuscito che cambia
            // `added`/props) lascia il contorno acceso per sempre, perché
            // l'evento nativo dragend arriva dopo che l'handler non c'è più.
            onDragEnd={() => setIsDraggingReorder(false)}
            aria-label={`Sposta ${meta.title}`}
            title="Trascina per spostare"
            // size-6→size-7, icona size-3.5→size-4: era troppo debole per
            // leggersi come maniglia (Claudio, punto collegato — non si
            // capiva nemmeno che il blocco si potesse prendere).
            // Mobile Interaction v1 — relative + after:-inset-2: l'area di
            // tocco vera arriva a 44px (28+8+8) senza che l'icona/il box
            // visivo crescano (resterebbe una maniglia "gigante" in
            // un'intestazione già stretta) — il ::after generato è dentro
            // lo stesso bottone, un tocco lì attiva comunque questo stesso
            // onDragStart/onClick, non un elemento a parte.
            className="relative text-ink-faint hover:bg-muted hover:text-foreground grid size-7 shrink-0 cursor-grab place-items-center rounded-md active:cursor-grabbing after:absolute after:-inset-2 after:content-['']"
          >
            <GripIcon className="size-4" />
          </button>
          {/* ▲▼ riordino mobile (Mobile Interaction v1) — solo in modalità
              "Modifica layout" (board.tsx) e solo sotto i 1536px
              (2xl:hidden, difensivo: la modalità stessa non ha nessun
              trigger visibile a desktop — Responsive Grid Fix 1024-1279px:
              soglia spostata da lg:/1024 a 2xl:/1536, non xl:/1280
              [misurato insufficiente, vedi top-bar.tsx], insieme al resto
              del "chrome" mobile/desktop). Alternativa al trascinamento
              HTML5 sopra (non affidabile su touch): sposta `type` di una
              posizione nell'ordine visivo mobile (moveMobileOrder,
              board-context.tsx) — stesso repackLayout/stessa persistenza
              di sempre, non un secondo layout. Disabilitato quando il
              blocco è già all'estremo in quella direzione. */}
          {mobileEditMode && (
            <div className="flex shrink-0 items-center gap-0.5 2xl:hidden">
              <button
                type="button"
                onClick={() => moveMobileOrder(type, "up")}
                disabled={isFirstMobile}
                aria-label={`Sposta ${meta.title} più in alto`}
                className="relative text-ink-faint hover:bg-muted hover:text-foreground grid size-7 shrink-0 place-items-center rounded-md disabled:opacity-30 after:absolute after:-inset-2 after:content-['']"
              >
                <ChevronUp className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => moveMobileOrder(type, "down")}
                disabled={isLastMobile}
                aria-label={`Sposta ${meta.title} più in basso`}
                className="relative text-ink-faint hover:bg-muted hover:text-foreground grid size-7 shrink-0 place-items-center rounded-md disabled:opacity-30 after:absolute after:-inset-2 after:content-['']"
              >
                <ChevronDown className="size-3.5" />
              </button>
            </div>
          )}
          <WidgetIcon type={type} className="text-ink-faint size-3.5 shrink-0" />
          <h3 className="font-heading min-w-0 flex-1 truncate text-sm font-medium">
            {meta.title}
          </h3>
          {emphasisLabel && (
            <span
              className={cn(
                "shrink-0 text-[0.6rem] font-semibold tracking-wide uppercase",
                effectiveEmphasis === "urgente" ? "text-destructive" : "text-primary",
              )}
            >
              {emphasisLabel}
            </span>
          )}
          <button
            type="button"
            onClick={() => removeWidget(type)}
            aria-label={`Rimuovi ${meta.title}`}
            // Mobile Interaction v1 — stessa tecnica del grip sopra:
            // after:-inset-2.5 porta l'area di tocco a 44px (24+10+10)
            // senza allargare il box visivo (era già -mr-1 per stare
            // vicino al bordo dell'header, l'area invisibile in più non
            // sposta né allarga nient'altro nel flusso).
            className="relative text-ink-faint hover:bg-muted hover:text-foreground -mr-1 grid size-6 shrink-0 place-items-center rounded-md text-base leading-none after:absolute after:-inset-2.5 after:content-['']"
          >
            &times;
          </button>
        </header>
        <EmphasisContext.Provider value={setContentEmphasis}>
          {/* @container: ogni blocco si può ridimensionare (maniglie sotto),
              quindi il suo contenuto deve reagire alla PROPRIA larghezza,
              non a quella della finestra — una container query, non un
              media query. Serve qui, un solo posto condiviso da tutti i
              widget, non ripetuto in ognuno (usato per ora solo da
              diario-widget.tsx/QuickStats, che a blocco ristretto andava
              in pezzi: segnalato da Claudio, "kg e h... si fukka tutto"). */}
          <div className="@container min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
        </EmphasisContext.Provider>

        {/* Maniglie di ridimensionamento: tutti e quattro i bordi, così si può
            afferrare il blocco da qualsiasi lato. Zona di presa larga
            (16px, prima 12px — Mobile Interaction v1: allargata quanto
            possibile senza sporgere nel gap tra i blocchi e rischiare di
            "rubare" il tocco al vicino) con una riga che si accende al
            passaggio del mouse, così si vede dove si può trascinare.
            touch-action:none (touch-none) già presente: impedisce allo
            scroll nativo della pagina di intercettare il gesto qui —
            invariato, era già corretto. */}
        <div
          onPointerDown={startResize(["top"])}
          className="group/edge absolute inset-x-3 top-0 z-10 h-4 cursor-ns-resize touch-none"
        >
          <span className="bg-primary absolute inset-x-2 top-0 h-[3px] scale-x-0 rounded-full opacity-0 transition group-hover/edge:scale-x-100 group-hover/edge:opacity-100" />
        </div>
        <div
          onPointerDown={startResize(["bottom"])}
          className="group/edge absolute inset-x-3 bottom-0 z-10 h-4 cursor-ns-resize touch-none"
        >
          <span className="bg-primary absolute inset-x-2 bottom-0 h-[3px] scale-x-0 rounded-full opacity-0 transition group-hover/edge:scale-x-100 group-hover/edge:opacity-100" />
        </div>
        <div
          onPointerDown={startResize(["left"])}
          className="group/edge absolute inset-y-3 left-0 z-10 w-4 cursor-ew-resize touch-none"
        >
          <span className="bg-primary absolute inset-y-2 left-0 w-[3px] scale-y-0 rounded-full opacity-0 transition group-hover/edge:scale-y-100 group-hover/edge:opacity-100" />
        </div>
        <div
          onPointerDown={startResize(["right"])}
          className="group/edge absolute inset-y-3 right-0 z-10 w-4 cursor-ew-resize touch-none"
        >
          <span className="bg-primary absolute inset-y-2 right-0 w-[3px] scale-y-0 rounded-full opacity-0 transition group-hover/edge:scale-y-100 group-hover/edge:opacity-100" />
        </div>
        <div
          onPointerDown={startResize(["right", "bottom"])}
          title="Trascina per ridimensionare"
          // Mobile Interaction v1 — relative + after:-inset-2: area di
          // tocco a 44px (28+8+8), stessa tecnica di grip/rimuovi sopra.
          // Resta dentro il padding del contenuto (p-4, sez. @container
          // sotto): non arriva a sovrapporre un textarea/input reale.
          className="text-ink-faint hover:text-primary absolute right-0 bottom-0 z-20 grid size-7 cursor-nwse-resize touch-none place-items-center after:absolute after:-inset-2 after:content-['']"
        >
          <ResizeCornerIcon className="size-4" />
        </div>
      </section>
    </>
  )
}
