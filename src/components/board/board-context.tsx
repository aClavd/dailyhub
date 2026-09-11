"use client"

import { createContext, useCallback, useContext, useMemo } from "react"

import {
  BOARD_ORDER_KEY,
  BOARD_SIZES_KEY,
  DEFAULT_ORDER,
  FIXED_WIDGETS,
  RAIL_STORAGE_KEY,
  SIZE_CYCLE,
  WIDGET_META,
  isWidgetType,
  type WidgetSize,
  type WidgetType,
} from "@/lib/board"
import { useLocalStorage } from "@/lib/use-local-storage"

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
  railCollapsed: boolean
  toggleRail: () => void
}

const BoardContext = createContext<BoardApi | null>(null)

function sanitizeOrder(raw: unknown): WidgetType[] {
  if (!Array.isArray(raw)) return DEFAULT_ORDER
  const seen = new Set<WidgetType>()
  const cleaned: WidgetType[] = []
  for (const entry of raw) {
    if (typeof entry === "string" && isWidgetType(entry) && !seen.has(entry)) {
      seen.add(entry)
      cleaned.push(entry)
    }
  }
  const missingFixed = FIXED_WIDGETS.filter((type) => !seen.has(type))
  return [...missingFixed, ...cleaned]
}

export function BoardProvider({ children }: { children: React.ReactNode }) {
  const [rawOrder, setOrder] = useLocalStorage<WidgetType[]>(BOARD_ORDER_KEY, DEFAULT_ORDER)
  const [sizes, setSizes] = useLocalStorage<SizeOverrides>(BOARD_SIZES_KEY, {})
  const [railCollapsed, setRailCollapsed] = useLocalStorage<boolean>(RAIL_STORAGE_KEY, false)

  const order = useMemo(() => sanitizeOrder(rawOrder), [rawOrder])

  const addWidget = useCallback(
    (type: WidgetType) => {
      if (FIXED_WIDGETS.includes(type)) return
      setOrder((prev) => {
        const list = sanitizeOrder(prev)
        return list.includes(type) ? list : [...list, type]
      })
    },
    [setOrder],
  )

  const removeWidget = useCallback(
    (type: WidgetType) => {
      if (FIXED_WIDGETS.includes(type)) return
      setOrder((prev) => sanitizeOrder(prev).filter((t) => t !== type))
    },
    [setOrder],
  )

  const moveWidget = useCallback(
    (from: WidgetType, to: WidgetType) => {
      if (from === to) return
      setOrder((prev) => {
        const list = sanitizeOrder(prev)
        const i = list.indexOf(from)
        const j = list.indexOf(to)
        if (i === -1 || j === -1) return list
        const next = [...list]
        ;[next[i], next[j]] = [next[j], next[i]]
        return next
      })
    },
    [setOrder],
  )

  const sizeOf = useCallback(
    (type: WidgetType) => sizes?.[type] ?? WIDGET_META[type].size,
    [sizes],
  )

  const cycleSize = useCallback(
    (type: WidgetType) => {
      setSizes((prev) => {
        const current = prev?.[type] ?? WIDGET_META[type].size
        const idx = SIZE_CYCLE.indexOf(current)
        const next = SIZE_CYCLE[(idx + 1) % SIZE_CYCLE.length]
        return { ...prev, [type]: next }
      })
    },
    [setSizes],
  )

  const toggleRail = useCallback(() => setRailCollapsed((prev) => !prev), [setRailCollapsed])

  const value = useMemo<BoardApi>(
    () => ({
      order,
      hasWidget: (type) => order.includes(type),
      addWidget,
      removeWidget,
      moveWidget,
      sizeOf,
      cycleSize,
      railCollapsed,
      toggleRail,
    }),
    [order, addWidget, removeWidget, moveWidget, sizeOf, cycleSize, railCollapsed, toggleRail],
  )

  return <BoardContext.Provider value={value}>{children}</BoardContext.Provider>
}

export function useBoard(): BoardApi {
  const ctx = useContext(BoardContext)
  if (!ctx) throw new Error("useBoard va usato dentro <BoardProvider>")
  return ctx
}
