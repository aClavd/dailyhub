import { WIDGET_META, type WidgetPlacement, type WidgetType } from "@/lib/board"

export type ResizeEdge = "left" | "right" | "top" | "bottom"

function overlaps(a: WidgetPlacement, b: WidgetPlacement): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

/** Applica lo spostamento del bordo a un singolo blocco — chi cresce, chi cede. */
function applyDelta(
  p: WidgetPlacement,
  edge: ResizeEdge,
  delta: number,
  isActive: boolean,
): WidgetPlacement {
  if (isActive) {
    if (edge === "right") return { ...p, w: p.w + delta }
    if (edge === "left") return { ...p, x: p.x - delta, w: p.w + delta }
    if (edge === "bottom") return { ...p, h: p.h + delta }
    return { ...p, y: p.y - delta, h: p.h + delta }
  }
  // Vicino: cede esattamente quanto l'attivo guadagna sullo stesso bordo.
  if (edge === "right") return { ...p, x: p.x + delta, w: p.w - delta }
  if (edge === "left") return { ...p, w: p.w - delta }
  if (edge === "bottom") return { ...p, y: p.y + delta, h: p.h - delta }
  return { ...p, h: p.h - delta }
}

/**
 * Ridimensiona `activeType` trascinando uno dei suoi 4 bordi di `deltaCells`
 * celle (positivo = il bordo si allontana dal blocco, quindi lo fa
 * crescere). Il vicino che condivide esattamente quel bordo (stesso x o
 * x+w per i bordi verticali, stesso y o y+h per quelli orizzontali, con
 * l'asse opposto che si sovrappone) cede — o riprende — lo spazio, non
 * tutta la board. Ogni blocco resta dentro i propri min/max (WIDGET_META):
 * se un vicino tocca il minimo il bordo si ferma lì (nessuna cascata al
 * vicino-del-vicino in questa versione — vedi il piano). Un ultimo controllo
 * anti-sovrapposizione contro tutti gli altri blocchi (non solo i vicini
 * diretti) tiene la griglia sempre valida anche in layout 2D irregolari.
 */
export function resizeEdge(
  layout: readonly WidgetPlacement[],
  activeType: WidgetType,
  edge: ResizeEdge,
  deltaCells: number,
): WidgetPlacement[] {
  if (deltaCells === 0) return layout as WidgetPlacement[]
  const active = layout.find((p) => p.type === activeType)
  if (!active) return layout as WidgetPlacement[]

  const horizontal = edge === "left" || edge === "right"
  const activeMeta = WIDGET_META[activeType]

  const boundary = edge === "right"
    ? active.x + active.w
    : edge === "left"
      ? active.x
      : edge === "bottom"
        ? active.y + active.h
        : active.y

  const neighbors = layout.filter((p) => {
    if (p.type === activeType) return false
    const sharesBoundary = horizontal
      ? edge === "right" ? p.x === boundary : p.x + p.w === boundary
      : edge === "bottom" ? p.y === boundary : p.y + p.h === boundary
    if (!sharesBoundary) return false
    return horizontal
      ? active.y < p.y + p.h && active.y + active.h > p.y
      : active.x < p.x + p.w && active.x + active.w > p.x
  })

  const grow = deltaCells > 0
  let allowed = grow
    ? Math.min(deltaCells, horizontal ? activeMeta.maxW - active.w : activeMeta.maxH - active.h)
    : Math.max(deltaCells, -(horizontal ? active.w - activeMeta.minW : active.h - activeMeta.minH))

  for (const n of neighbors) {
    const meta = WIDGET_META[n.type]
    const room = grow
      ? (horizontal ? n.w - meta.minW : n.h - meta.minH)
      : (horizontal ? meta.maxW - n.w : meta.maxH - n.h)
    allowed = grow ? Math.min(allowed, room) : Math.max(allowed, -room)
  }

  if (allowed === 0) return layout as WidgetPlacement[]

  const neighborTypes = new Set(neighbors.map((n) => n.type))
  const others = layout.filter((p) => p.type !== activeType && !neighborTypes.has(p.type))

  // Rete di sicurezza: riduce la magnitudine finché il risultato non crea
  // sovrapposizioni con blocchi non direttamente coinvolti nel bordo.
  const step = allowed > 0 ? -1 : 1
  while (allowed !== 0) {
    const nextActive = applyDelta(active, edge, allowed, true)
    const nextNeighbors = neighbors.map((n) => applyDelta(n, edge, allowed, false))
    const clean = others.every(
      (o) => !overlaps(o, nextActive) && !nextNeighbors.some((n) => overlaps(o, n)),
    )
    if (clean) break
    allowed += step
  }

  if (allowed === 0) return layout as WidgetPlacement[]

  return layout.map((p) => {
    if (p.type === activeType) return applyDelta(p, edge, allowed, true)
    if (neighborTypes.has(p.type)) return applyDelta(p, edge, allowed, false)
    return p
  })
}
