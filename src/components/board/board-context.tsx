"use client"

import { createContext, useCallback, useContext, useMemo } from "react"

import {
  BOARD_STORAGE_KEY,
  DEFAULT_LAYOUT,
  FIXED_WIDGETS,
  RAIL_STORAGE_KEY,
  type WidgetType,
} from "@/lib/board"
import { useLocalStorage } from "@/lib/use-local-storage"

type BoardApi = {
  layout: WidgetType[]
  hasWidget: (type: WidgetType) => boolean
  addWidget: (type: WidgetType) => void
  removeWidget: (type: WidgetType) => void
  railCollapsed: boolean
  toggleRail: () => void
}

const BoardContext = createContext<BoardApi | null>(null)

export function BoardProvider({ children }: { children: React.ReactNode }) {
  const [rawLayout, setLayout] = useLocalStorage<WidgetType[]>(
    BOARD_STORAGE_KEY,
    DEFAULT_LAYOUT,
  )
  const [railCollapsed, setRailCollapsed] = useLocalStorage<boolean>(
    RAIL_STORAGE_KEY,
    false,
  )

  // Difende da valori vecchi/corrotti in localStorage.
  const layout = useMemo(
    () =>
      Array.isArray(rawLayout)
        ? rawLayout.filter(
            (t) => !FIXED_WIDGETS.includes(t) && typeof t === "string",
          )
        : DEFAULT_LAYOUT,
    [rawLayout],
  )

  const addWidget = useCallback(
    (type: WidgetType) => {
      if (FIXED_WIDGETS.includes(type)) return
      setLayout((prev) => {
        const list = Array.isArray(prev) ? prev : []
        return list.includes(type) ? list : [...list, type]
      })
    },
    [setLayout],
  )

  const removeWidget = useCallback(
    (type: WidgetType) => {
      setLayout((prev) => (Array.isArray(prev) ? prev.filter((t) => t !== type) : []))
    },
    [setLayout],
  )

  const toggleRail = useCallback(
    () => setRailCollapsed((prev) => !prev),
    [setRailCollapsed],
  )

  const value = useMemo<BoardApi>(
    () => ({
      layout,
      hasWidget: (type) => layout.includes(type),
      addWidget,
      removeWidget,
      railCollapsed,
      toggleRail,
    }),
    [layout, addWidget, removeWidget, railCollapsed, toggleRail],
  )

  return <BoardContext.Provider value={value}>{children}</BoardContext.Provider>
}

export function useBoard(): BoardApi {
  const ctx = useContext(BoardContext)
  if (!ctx) throw new Error("useBoard va usato dentro <BoardProvider>")
  return ctx
}
