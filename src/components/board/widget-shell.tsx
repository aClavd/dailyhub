"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { resizeEdge, type ResizeEdge } from "@/lib/board-resize"
import { REORDER_MIME, WIDGET_META, type WidgetType } from "@/lib/board"
import { cn } from "@/lib/utils"

import { useBoard } from "./board-context"
import { GripIcon, ResizeCornerIcon } from "./widget-icon"

type LiveRect = { left: number; top: number; width: number; height: number }

export function WidgetShell({
  type,
  fixed = false,
  children,
}: {
  type: WidgetType
  fixed?: boolean
  children: React.ReactNode
}) {
  const { committedLayout, placementOf, setPreview, commitLayout, removeWidget, moveWidget } =
    useBoard()
  const meta = WIDGET_META[type]
  const placement = placementOf(type)
  const committedPlacement = committedLayout.find((p) => p.type === type)
  const [dragOver, setDragOver] = useState(false)
  const [justResized, setJustResized] = useState(false)
  // Non nullo solo mentre trascini un bordo: il blocco esce dal flusso della
  // griglia e segue il mouse pixel per pixel (vedi startResize). Il
  // "modello dati" sotto resta comunque a celle, invariato — è solo il
  // livello visivo di questo blocco durante il trascinamento.
  const [liveRect, setLiveRect] = useState<LiveRect | null>(null)
  const prevSize = useRef({ w: committedPlacement?.w, h: committedPlacement?.h })
  const sectionRef = useRef<HTMLElement | null>(null)

  // Breve "assestamento" quando la taglia definitiva cambia — sul blocco
  // attivo e su qualunque vicino a cui il resize ha tolto/dato spazio, non
  // durante il trascinamento (solo quando il valore *committato* cambia).
  useEffect(() => {
    if (!committedPlacement) return
    if (prevSize.current.w !== committedPlacement.w || prevSize.current.h !== committedPlacement.h) {
      prevSize.current = { w: committedPlacement.w, h: committedPlacement.h }
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
            : {
                gridColumn: `${placement.x + 1} / span ${placement.w}`,
                gridRow: `${placement.y + 1} / span ${placement.h}`,
              }
        }
        className={cn(
          // h-full riempie esattamente la cella (o le celle) assegnate dalla
          // griglia della board: la tile ha sempre la dimensione del proprio
          // placement, il contenuto che non ci sta scorre dentro invece di
          // deformarla. board-cell: vedi globals.css, sotto sm: forza una
          // colonna piena larghezza (batte questo style inline).
          "board-cell bg-card ring-foreground/10 relative flex h-full min-w-0 flex-col overflow-hidden rounded-xl ring-1",
          (dragOver || resizing) && "ring-primary ring-2",
          liveRect && "shadow-lg",
          justResized && "[animation:widget-settle_220ms_ease-out]",
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

        {/* Maniglie di ridimensionamento: tutti e quattro i bordi, così si può
            afferrare il blocco da qualsiasi lato. Zona di presa larga (12px)
            con una riga che si accende al passaggio del mouse, così si vede
            dove si può trascinare. */}
        <div
          onPointerDown={startResize(["top"])}
          className="group/edge absolute inset-x-3 top-0 z-10 h-3 cursor-ns-resize touch-none"
        >
          <span className="bg-primary absolute inset-x-2 top-0 h-[3px] scale-x-0 rounded-full opacity-0 transition group-hover/edge:scale-x-100 group-hover/edge:opacity-100" />
        </div>
        <div
          onPointerDown={startResize(["bottom"])}
          className="group/edge absolute inset-x-3 bottom-0 z-10 h-3 cursor-ns-resize touch-none"
        >
          <span className="bg-primary absolute inset-x-2 bottom-0 h-[3px] scale-x-0 rounded-full opacity-0 transition group-hover/edge:scale-x-100 group-hover/edge:opacity-100" />
        </div>
        <div
          onPointerDown={startResize(["left"])}
          className="group/edge absolute inset-y-3 left-0 z-10 w-3 cursor-ew-resize touch-none"
        >
          <span className="bg-primary absolute inset-y-2 left-0 w-[3px] scale-y-0 rounded-full opacity-0 transition group-hover/edge:scale-y-100 group-hover/edge:opacity-100" />
        </div>
        <div
          onPointerDown={startResize(["right"])}
          className="group/edge absolute inset-y-3 right-0 z-10 w-3 cursor-ew-resize touch-none"
        >
          <span className="bg-primary absolute inset-y-2 right-0 w-[3px] scale-y-0 rounded-full opacity-0 transition group-hover/edge:scale-y-100 group-hover/edge:opacity-100" />
        </div>
        <div
          onPointerDown={startResize(["right", "bottom"])}
          title="Trascina per ridimensionare"
          className="text-ink-faint hover:text-primary absolute right-0 bottom-0 z-20 grid size-7 cursor-nwse-resize touch-none place-items-center"
        >
          <ResizeCornerIcon className="size-4" />
        </div>
      </section>
    </>
  )
}
