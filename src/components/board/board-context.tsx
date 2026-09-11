"use client"

import { createContext, useCallback, useContext, useMemo, useState, useTransition } from "react"

import { saveBoardLayout } from "@/lib/actions/board"
import {
  FIXED_WIDGETS,
  SIZE_CYCLE,
  WIDGET_META,
  isWidgetType,
  type BoardState,
  type WidgetSize,
  type WidgetType,
} from "@/lib/board"

type SizeOverrides = Partial<Record<WidgetType, WidgetSize>>

type BoardApi = {
  /** Ordine completo di visualizzazione: fissi + blocchi di libreria aggiunti. */
  order: WidgetType[]
  hasWidget: (type: WidgetType) => boolean
  addWidget: (type: WidgetType) => void
  removeWidget: (type: WidgetType) => void
  /** Scambia di posizione due blocchi (si trascina l'uno sull'altro). */
  moveWidget: (from: WidgetType, to: WidgetType) => void
  sizeOf: (type: WidgetType) => WidgetSize
  cycleSize: (type: WidgetType) => void
  setSize: (type: WidgetType, size: WidgetSize) => void
  railCollapsed: boolean
  toggleRail: () => void
}

const BoardContext = createContext<BoardApi | null>(null)

function sanitizeOrder(raw: WidgetType[]): WidgetType[] {
  const seen = new Set<WidgetType>()
  const cleaned: WidgetType[] = []
  for (const entry of raw) {
    if (isWidgetType(entry) && !seen.has(entry)) {
      seen.add(entry)
      cleaned.push(entry)
    }
  }
  const missingFixed = FIXED_WIDGETS.filter((type) => !seen.has(type))
  return [...missingFixed, ...cleaned]
}

export function BoardProvider({
  initial,
  children,
}: {
  initial: BoardState
  children: React.ReactNode
}) {
  const [order, setOrder] = useState<WidgetType[]>(() => sanitizeOrder(initial.order))
  const [sizes, setSizes] = useState<SizeOverrides>(initial.sizes)
  const [railCollapsed, setRailCollapsed] = useState(initial.railCollapsed)
  const [, startTransition] = useTransition()

  // Salva sul DB in background; lo stato locale è già aggiornato, quindi la
  // UI non aspetta il giro di rete.
  const persist = useCallback((patch: Partial<BoardState>) => {
    startTransition(() => {
      void saveBoardLayout({
        order: patch.order ?? order,
        sizes: patch.sizes ?? sizes,
        railCollapsed: patch.railCollapsed ?? railCollapsed,
      })
    })
    // order/sizes/railCollapsed intenzionalmente fuori dalle dipendenze:
    // ogni chiamante passa già il valore aggiornato nel patch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addWidget = useCallback(
    (type: WidgetType) => {
      if (FIXED_WIDGETS.includes(type) || order.includes(type)) return
      const next = [...order, type]
      setOrder(next)
      persist({ order: next })
    },
    [order, persist],
  )

  const removeWidget = useCallback(
    (type: WidgetType) => {
      if (FIXED_WIDGETS.includes(type)) return
      const next = order.filter((t) => t !== type)
      setOrder(next)
      persist({ order: next })
    },
    [order, persist],
  )

  const moveWidget = useCallback(
    (from: WidgetType, to: WidgetType) => {
      if (from === to) return
      const i = order.indexOf(from)
      const j = order.indexOf(to)
      if (i === -1 || j === -1) return
      const next = [...order]
      ;[next[i], next[j]] = [next[j], next[i]]
      setOrder(next)
      persist({ order: next })
    },
    [order, persist],
  )

  const sizeOf = useCallback(
    (type: WidgetType) => sizes[type] ?? WIDGET_META[type].size,
    [sizes],
  )

  const cycleSize = useCallback(
    (type: WidgetType) => {
      const current = sizes[type] ?? WIDGET_META[type].size
      const idx = SIZE_CYCLE.indexOf(current)
      const nextSize = SIZE_CYCLE[(idx + 1) % SIZE_CYCLE.length]
      const next = { ...sizes, [type]: nextSize }
      setSizes(next)
      persist({ sizes: next })
    },
    [sizes, persist],
  )

  const setSize = useCallback(
    (type: WidgetType, size: WidgetSize) => {
      if (sizes[type] === size) return
      const next = { ...sizes, [type]: size }
      setSizes(next)
      persist({ sizes: next })
    },
    [sizes, persist],
  )

  const toggleRail = useCallback(() => {
    const next = !railCollapsed
    setRailCollapsed(next)
    persist({ railCollapsed: next })
  }, [railCollapsed, persist])

  const value = useMemo<BoardApi>(
    () => ({
      order,
      hasWidget: (type) => order.includes(type),
      addWidget,
      removeWidget,
      moveWidget,
      sizeOf,
      cycleSize,
      setSize,
      railCollapsed,
      toggleRail,
    }),
    [
      order,
      addWidget,
      removeWidget,
      moveWidget,
      sizeOf,
      cycleSize,
      setSize,
      railCollapsed,
      toggleRail,
    ],
  )

  return <BoardContext.Provider value={value}>{children}</BoardContext.Provider>
}

export function useBoard(): BoardApi {
  const ctx = useContext(BoardContext)
  if (!ctx) throw new Error("useBoard va usato dentro <BoardProvider>")
  return ctx
}
