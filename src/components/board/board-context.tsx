"use client"

import { createContext, useCallback, useContext, useMemo, useState, useTransition } from "react"

import { saveBoardLayout } from "@/lib/actions/board"
import {
  FIXED_WIDGETS,
  WIDGET_META,
  findFreeSpot,
  type BoardState,
  type WidgetPlacement,
  type WidgetType,
} from "@/lib/board"

type BoardApi = {
  /** Posizione/dimensione di ogni blocco — committata, oppure l'anteprima
   * live se un resize è in corso (vedi `previewLayout`/`setPreview`). Quello
   * su cui si renderizza la board. */
  layout: WidgetPlacement[]
  /** Il layout salvato per davvero, senza anteprima — base per i mutatori
   * e punto di partenza di un nuovo trascinamento. */
  committedLayout: WidgetPlacement[]
  hasWidget: (type: WidgetType) => boolean
  addWidget: (type: WidgetType) => void
  removeWidget: (type: WidgetType) => void
  /** Scambia posizione e dimensione di due blocchi (si trascina l'uno sull'altro). */
  moveWidget: (from: WidgetType, to: WidgetType) => void
  placementOf: (type: WidgetType) => WidgetPlacement | undefined
  /** Anteprima di un resize in corso: la board intera si ridisegna su questo
   * layout (attivo + vicini che cedono spazio) senza ancora salvare. */
  setPreview: (next: WidgetPlacement[] | null) => void
  /**
   * Salva `next` come nuovo layout committato e chiude l'anteprima. Prende
   * il layout esplicitamente (non lo rilegge da `previewLayout`): chi
   * chiama lo calcola già localmente ad ogni pointermove, e un closure
   * catturato al pointerdown vedrebbe sempre il valore di quel momento
   * (null, prima che l'anteprima parta) — è la causa di un bug reale che
   * ho avuto in questa stessa sessione (il resize si vedeva durante il
   * trascinamento ma spariva sempre al rilascio).
   */
  commitLayout: (next: WidgetPlacement[]) => void
  railCollapsed: boolean
  toggleRail: () => void
  /** Nomi delle abitudini del widget Diario — condivisi tra tutti i giorni. */
  habitList: string[]
  addHabit: (label: string) => void
  removeHabit: (label: string) => void
}

const BoardContext = createContext<BoardApi | null>(null)

function sanitizeLayout(raw: WidgetPlacement[]): WidgetPlacement[] {
  const seen = new Set<WidgetType>()
  const cleaned: WidgetPlacement[] = []
  for (const p of raw) {
    if (p.type in WIDGET_META && !seen.has(p.type)) {
      seen.add(p.type)
      cleaned.push(p)
    }
  }
  const missingFixed = FIXED_WIDGETS.filter((type) => !seen.has(type))
  for (const type of missingFixed) {
    const meta = WIDGET_META[type]
    const { x, y } = findFreeSpot(cleaned, meta.w, meta.h)
    cleaned.push({ type, x, y, w: meta.w, h: meta.h })
  }
  return cleaned
}

export function BoardProvider({
  initial,
  children,
}: {
  initial: BoardState
  children: React.ReactNode
}) {
  const [committedLayout, setCommittedLayout] = useState<WidgetPlacement[]>(() =>
    sanitizeLayout(initial.layout),
  )
  const [previewLayout, setPreviewLayout] = useState<WidgetPlacement[] | null>(null)
  const [railCollapsed, setRailCollapsed] = useState(initial.railCollapsed)
  const [habitList, setHabitList] = useState<string[]>(initial.habitList)
  const [, startTransition] = useTransition()

  // Salva sul DB in background; lo stato locale è già aggiornato, quindi la
  // UI non aspetta il giro di rete.
  const persist = useCallback((patch: Partial<BoardState>) => {
    startTransition(() => {
      void saveBoardLayout({
        layout: patch.layout ?? committedLayout,
        railCollapsed: patch.railCollapsed ?? railCollapsed,
        habitList: patch.habitList ?? habitList,
      })
    })
    // committedLayout/railCollapsed/habitList intenzionalmente fuori dalle
    // dipendenze: ogni chiamante passa già il valore aggiornato nel patch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setLayout = useCallback(
    (next: WidgetPlacement[]) => {
      setCommittedLayout(next)
      persist({ layout: next })
    },
    [persist],
  )

  const addWidget = useCallback(
    (type: WidgetType) => {
      if (FIXED_WIDGETS.includes(type) || committedLayout.some((p) => p.type === type)) return
      const meta = WIDGET_META[type]
      const { x, y } = findFreeSpot(committedLayout, meta.w, meta.h)
      setLayout([...committedLayout, { type, x, y, w: meta.w, h: meta.h }])
    },
    [committedLayout, setLayout],
  )

  const removeWidget = useCallback(
    (type: WidgetType) => {
      if (FIXED_WIDGETS.includes(type)) return
      setLayout(committedLayout.filter((p) => p.type !== type))
    },
    [committedLayout, setLayout],
  )

  const moveWidget = useCallback(
    (from: WidgetType, to: WidgetType) => {
      if (from === to) return
      const a = committedLayout.find((p) => p.type === from)
      const b = committedLayout.find((p) => p.type === to)
      if (!a || !b) return
      setLayout(
        committedLayout.map((p) => {
          if (p.type === from) return { ...p, x: b.x, y: b.y, w: b.w, h: b.h }
          if (p.type === to) return { ...p, x: a.x, y: a.y, w: a.w, h: a.h }
          return p
        }),
      )
    },
    [committedLayout, setLayout],
  )

  const layout = previewLayout ?? committedLayout
  const placementOf = useCallback((type: WidgetType) => layout.find((p) => p.type === type), [layout])

  const commitLayout = useCallback(
    (next: WidgetPlacement[]) => {
      setLayout(next)
      setPreviewLayout(null)
    },
    [setLayout],
  )

  const toggleRail = useCallback(() => {
    const next = !railCollapsed
    setRailCollapsed(next)
    persist({ railCollapsed: next })
  }, [railCollapsed, persist])

  const addHabit = useCallback(
    (label: string) => {
      if (habitList.includes(label)) return
      const next = [...habitList, label]
      setHabitList(next)
      persist({ habitList: next })
    },
    [habitList, persist],
  )

  const removeHabit = useCallback(
    (label: string) => {
      const next = habitList.filter((h) => h !== label)
      setHabitList(next)
      persist({ habitList: next })
    },
    [habitList, persist],
  )

  const value = useMemo<BoardApi>(
    () => ({
      layout,
      committedLayout,
      hasWidget: (type) => committedLayout.some((p) => p.type === type),
      addWidget,
      removeWidget,
      moveWidget,
      placementOf,
      setPreview: setPreviewLayout,
      commitLayout,
      railCollapsed,
      toggleRail,
      habitList,
      addHabit,
      removeHabit,
    }),
    [
      layout,
      committedLayout,
      addWidget,
      removeWidget,
      moveWidget,
      placementOf,
      commitLayout,
      railCollapsed,
      toggleRail,
      habitList,
      addHabit,
      removeHabit,
    ],
  )

  return <BoardContext.Provider value={value}>{children}</BoardContext.Provider>
}

export function useBoard(): BoardApi {
  const ctx = useContext(BoardContext)
  if (!ctx) throw new Error("useBoard va usato dentro <BoardProvider>")
  return ctx
}
