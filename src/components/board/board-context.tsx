"use client"

import { createContext, useCallback, useContext, useMemo, useRef, useState, useTransition } from "react"

import {
  createBoardLayout,
  deleteBoardLayout,
  fetchBoardLayouts,
  renameBoardLayout,
  saveBoardLayout,
  switchBoardLayout,
  type BoardLayoutActionResult,
} from "@/lib/actions/board"
import {
  WIDGET_META,
  findFreeSpot,
  type ActiveBoardState,
  type BoardState,
  type SavedLayoutSummary,
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
  /** Comprimi/espandi del pannello destro (Right Sidebar) — indipendente
   * dal rail sinistro sopra, stesso schema. */
  rightPanelCollapsed: boolean
  toggleRightPanel: () => void
  /** Nomi delle abitudini del widget Diario — condivisi tra tutti i giorni. */
  habitList: string[]
  addHabit: (label: string) => void
  removeHabit: (label: string) => void

  // Fase 5.4 — layout salvati con nome, uno attivo alla volta.
  layoutId: string
  layoutName: string
  /** Elenco completo (senza contenuto) per lo switcher — null finché
   * `loadLayouts` non è stato chiamato almeno una volta (si carica solo
   * quando serve, non a ogni render della board). */
  layouts: SavedLayoutSummary[] | null
  loadLayouts: () => void
  switchLayout: (id: string) => Promise<void>
  createLayout: (name: string) => Promise<BoardLayoutActionResult>
  renameLayout: (id: string, name: string) => Promise<{ ok: boolean; reason?: string }>
  deleteLayout: (id: string) => Promise<{ ok: boolean; reason?: string }>

  /** Segnale live (non persistito): è arrivata mail recente — legge il rail
   * per mostrare un pallino sulla voce "Mail" della libreria quando il
   * blocco non è sulla board (mail-card.tsx lo popola). */
  mailHasRecent: boolean
  setMailHasRecent: (value: boolean) => void

  /** Vero mentre si trascina un blocco dalla Libreria (acceso da rail.tsx
   * al dragstart, spento al dragend) — board.tsx lo legge per mostrare
   * subito la zona di rilascio, non solo quando il cursore ci passa sopra. */
  isDraggingWidget: boolean
  setIsDraggingWidget: (value: boolean) => void
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
  return cleaned
}

export function BoardProvider({
  initial,
  children,
}: {
  initial: ActiveBoardState
  children: React.ReactNode
}) {
  const [committedLayout, setCommittedLayout] = useState<WidgetPlacement[]>(() =>
    sanitizeLayout(initial.layout),
  )
  const [previewLayout, setPreviewLayout] = useState<WidgetPlacement[] | null>(null)
  const [railCollapsed, setRailCollapsed] = useState(initial.railCollapsed)
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(initial.rightPanelCollapsed)
  const [habitList, setHabitList] = useState<string[]>(initial.habitList)
  const [layoutId, setLayoutId] = useState(initial.layoutId)
  const [layoutName, setLayoutName] = useState(initial.layoutName)
  const [layouts, setLayouts] = useState<SavedLayoutSummary[] | null>(null)
  const [mailHasRecent, setMailHasRecent] = useState(false)
  const [isDraggingWidget, setIsDraggingWidget] = useState(false)
  const [, startTransition] = useTransition()

  // Letto da `persist` senza essere una dipendenza reattiva — cambia solo
  // via switchLayout/createLayout/deleteLayout, mai durante una mutazione
  // di board qualsiasi: un ref evita di dover ricreare `persist` (e quindi
  // tutti i mutatori che ne dipendono) ogni volta che cambi layout.
  const layoutIdRef = useRef(initial.layoutId)

  // Salva sul DB in background; lo stato locale è già aggiornato, quindi la
  // UI non aspetta il giro di rete.
  const persist = useCallback((patch: Partial<BoardState>) => {
    startTransition(() => {
      void saveBoardLayout(layoutIdRef.current, {
        layout: patch.layout ?? committedLayout,
        railCollapsed: patch.railCollapsed ?? railCollapsed,
        rightPanelCollapsed: patch.rightPanelCollapsed ?? rightPanelCollapsed,
        habitList: patch.habitList ?? habitList,
      })
    })
    // committedLayout/railCollapsed/rightPanelCollapsed/habitList
    // intenzionalmente fuori dalle dipendenze: ogni chiamante passa già il
    // valore aggiornato nel patch.
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
      if (committedLayout.some((p) => p.type === type)) return
      const meta = WIDGET_META[type]
      const { x, y } = findFreeSpot(committedLayout, meta.w, meta.h)
      setLayout([...committedLayout, { type, x, y, w: meta.w, h: meta.h }])
    },
    [committedLayout, setLayout],
  )

  const removeWidget = useCallback(
    (type: WidgetType) => {
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

  const toggleRightPanel = useCallback(() => {
    const next = !rightPanelCollapsed
    setRightPanelCollapsed(next)
    persist({ rightPanelCollapsed: next })
  }, [rightPanelCollapsed, persist])

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

  // Applica uno ActiveBoardState fresco (dopo switch/crea/elimina) allo
  // stato locale — un solo posto per non ripetere le stesse 6 righe in
  // ognuna delle tre azioni sotto.
  const applyActiveState = useCallback((state: ActiveBoardState) => {
    layoutIdRef.current = state.layoutId
    setLayoutId(state.layoutId)
    setLayoutName(state.layoutName)
    setCommittedLayout(sanitizeLayout(state.layout))
    setPreviewLayout(null)
    setRailCollapsed(state.railCollapsed)
    setRightPanelCollapsed(state.rightPanelCollapsed)
    setHabitList(state.habitList)
  }, [])

  const loadLayouts = useCallback(() => {
    startTransition(async () => {
      setLayouts(await fetchBoardLayouts())
    })
  }, [])

  const switchLayout = useCallback(
    async (id: string) => {
      if (id === layoutIdRef.current) return
      const state = await switchBoardLayout(id)
      if (!state) return
      applyActiveState(state)
      setLayouts((prev) => prev?.map((l) => ({ ...l, isActive: l.id === state.layoutId })) ?? null)
    },
    [applyActiveState],
  )

  const createLayout = useCallback(
    async (name: string) => {
      const result = await createBoardLayout(name)
      if (result.ok) {
        applyActiveState(result.state)
        setLayouts(null) // ricaricata al prossimo loadLayouts (switcher riaperto)
      }
      return result
    },
    [applyActiveState],
  )

  const renameLayout = useCallback(async (id: string, name: string) => {
    const result = await renameBoardLayout(id, name)
    if (result.ok) {
      const trimmed = name.trim()
      setLayouts((prev) => prev?.map((l) => (l.id === id ? { ...l, name: trimmed } : l)) ?? null)
      if (id === layoutIdRef.current) setLayoutName(trimmed)
    }
    return result
  }, [])

  const deleteLayout = useCallback(
    async (id: string) => {
      const result = await deleteBoardLayout(id)
      if (result.ok) {
        setLayouts((prev) => prev?.filter((l) => l.id !== id) ?? null)
        if (result.state) applyActiveState(result.state)
      }
      return result
    },
    [applyActiveState],
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
      rightPanelCollapsed,
      toggleRightPanel,
      habitList,
      addHabit,
      removeHabit,
      layoutId,
      layoutName,
      layouts,
      loadLayouts,
      switchLayout,
      createLayout,
      renameLayout,
      deleteLayout,
      mailHasRecent,
      setMailHasRecent,
      isDraggingWidget,
      setIsDraggingWidget,
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
      rightPanelCollapsed,
      toggleRightPanel,
      habitList,
      addHabit,
      removeHabit,
      layoutId,
      layoutName,
      layouts,
      loadLayouts,
      switchLayout,
      createLayout,
      renameLayout,
      deleteLayout,
      mailHasRecent,
      isDraggingWidget,
    ],
  )

  return <BoardContext.Provider value={value}>{children}</BoardContext.Provider>
}

export function useBoard(): BoardApi {
  const ctx = useContext(BoardContext)
  if (!ctx) throw new Error("useBoard va usato dentro <BoardProvider>")
  return ctx
}
