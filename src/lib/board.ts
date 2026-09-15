import { DEFAULT_HABITS } from "@/lib/diario"

export type WidgetType =
  | "agenda"
  | "mail"
  | "diario"
  | "pomodoro"
  | "calendario"
  | "note"
  | "obiettivi"
  | "lettura"
  | "acqua"

/** Larghezza della griglia logica della board, in celle. */
export const BOARD_COLS = 6

/**
 * Larghezza di una colonna, in rem — unica fonte di verità, usata sia qui
 * (per calcolare la larghezza naturale della board) sia in board.tsx (per
 * il `minmax()` del CSS Grid vero): prima erano due letterali duplicati
 * che potevano disallinearsi. CELL_MAX è quella "piena" quando c'è spazio
 * (Fase 5.1: alzata da 15 a 16.5, +10%, per usare meglio gli schermi
 * larghi senza aggiungere colonne né allargare un widget più di un altro
 * — cresce l'unità di misura comune, non le proporzioni scelte da
 * Claudio). CELL_MIN resta la protezione su finestre strette, non tocca.
 */
export const CELL_MAX_REM = 16.5
export const CELL_MIN_REM = 8

/** Posizione e dimensione di un blocco sulla griglia logica, in celle (non px). */
export type WidgetPlacement = {
  type: WidgetType
  x: number
  y: number
  w: number
  h: number
}

export type WidgetMeta = {
  title: string
  /** Testo breve mostrato nella libreria. */
  desc: string
  /** Dimensione iniziale, in celle. */
  w: number
  h: number
  minW: number
  minH: number
  maxW: number
  maxH: number
}

export const WIDGET_META: Record<WidgetType, WidgetMeta> = {
  agenda: {
    title: "Impegni di oggi",
    desc: "eventi di Google Calendar",
    w: 2, h: 2, minW: 1, minH: 1, maxW: 4, maxH: 3,
  },
  mail: {
    title: "Mail importanti",
    desc: "Gmail + Libero",
    // minW 2: sotto ci sono le 3 tab Tutte/Gmail/Libero, a 1 cella diventano illeggibili.
    w: 2, h: 2, minW: 2, minH: 1, maxW: 4, maxH: 3,
  },
  diario: {
    title: "Diario di oggi",
    desc: "journaling, abitudini, peso, sonno, umore",
    w: 2, h: 2, minW: 1, minH: 2, maxW: 3, maxH: 4,
  },
  pomodoro: { title: "Studio · Pomodoro", desc: "timer 25 / 5", w: 1, h: 1, minW: 1, minH: 1, maxW: 2, maxH: 2 },
  calendario: {
    title: "Calendario",
    desc: "vista mese, Google Calendar",
    // Più largo di default degli altri: 7 colonne (giorni) leggibili
    // servono più spazio orizzontale di un elenco o un contatore.
    w: 3, h: 3, minW: 2, minH: 2, maxW: 6, maxH: 4,
  },
  note: { title: "Note rapide", desc: "un pensiero al volo", w: 1, h: 1, minW: 1, minH: 1, maxW: 2, maxH: 2 },
  obiettivi: {
    title: "Obiettivi della settimana",
    desc: "3 cose che contano",
    w: 1, h: 2, minW: 1, minH: 1, maxW: 2, maxH: 3,
  },
  lettura: { title: "Lettura", desc: "libro in corso", w: 1, h: 1, minW: 1, minH: 1, maxW: 2, maxH: 2 },
  acqua: { title: "Acqua", desc: "bicchieri di oggi", w: 1, h: 1, minW: 1, minH: 1, maxW: 2, maxH: 2 },
}

/**
 * Blocchi trascinabili dalla libreria — tutti, Impegni/Mail compresi (prima
 * erano "fissi", non più: si possono togliere e rimettere come qualsiasi
 * altro blocco). "meteo" (e "spotify") non ci sono: non sono blocchi della
 * board, sono fissi in testata ai lati del saluto (dashboard-header.tsx) —
 * non ha senso poterli rimuovere o spostare come gli altri.
 */
export const LIBRARY_WIDGETS: readonly WidgetType[] = [
  "agenda",
  "mail",
  "diario",
  "pomodoro",
  "calendario",
  "note",
  "obiettivi",
  "lettura",
  "acqua",
]

/** Blocchi di libreria presenti sulla board al primo avvio. */
export const DEFAULT_LAYOUT: WidgetType[] = ["diario", "pomodoro"]

/** Colonne davvero usate dai blocchi presenti — vedi boardNaturalWidthRem. */
export function boardUsedCols(layout: readonly WidgetPlacement[]): number {
  return Math.max(1, ...layout.map((p) => p.x + p.w))
}

/**
 * Larghezza "naturale" della board in rem (tutte le colonne a CELL_MAX_REM
 * piene, gap di 1rem inclusi) — quella che userebbe se ci stesse comoda.
 * Condivisa da board.tsx (la griglia vera) e header-flanking-row.tsx
 * (Meteo/Spotify in testata, allineati agli stessi bordi): usando la
 * stessa formula sui dati dello stesso useBoard(), i due combaciano sempre
 * in pixel, senza dover misurare nulla via JS.
 */
export function boardNaturalWidthRem(layout: readonly WidgetPlacement[]): number {
  const cols = boardUsedCols(layout)
  return cols * CELL_MAX_REM + (cols - 1)
}

/**
 * Come boardNaturalWidthRem, ma con un minimo di rispetto (3 colonne
 * piene) — con 1 blocco solo (o board vuota) la larghezza naturale può
 * essere molto stretta, e sia la zona di trascinamento (board.tsx) sia la
 * riga Meteo/saluto/Spotify (header-flanking-row.tsx) diventavano
 * schiacciate/appiccicate invece di restare ariose. Usando la stessa
 * funzione in entrambi i posti restano sempre allineate — anche quando
 * il minimo entra in gioco, non solo quando la board è già larga di suo.
 */
export function boardDisplayWidthRem(layout: readonly WidgetPlacement[]): number {
  return Math.max(boardNaturalWidthRem(layout), 3 * CELL_MAX_REM + 2)
}

/**
 * Prima posizione libera (bin-packing first-fit, riga per riga) per un
 * blocco w×h che non si sovrapponga a niente di già piazzato e non superi
 * BOARD_COLS in larghezza.
 */
export function findFreeSpot(
  layout: readonly WidgetPlacement[],
  w: number,
  h: number,
): { x: number; y: number } {
  const fits = (x: number, y: number) =>
    x + w <= BOARD_COLS &&
    !layout.some((p) => x < p.x + p.w && x + w > p.x && y < p.y + p.h && y + h > p.y)

  const maxY = layout.reduce((m, p) => Math.max(m, p.y + p.h), 0)
  for (let y = 0; y <= maxY; y++) {
    for (let x = 0; x <= BOARD_COLS - w; x++) {
      if (fits(x, y)) return { x, y }
    }
  }
  return { x: 0, y: maxY }
}

function placementsOverlap(a: WidgetPlacement, b: WidgetPlacement): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

/**
 * Ripara un layout eventualmente corrotto — coordinate negative o oltre
 * BOARD_COLS, blocchi sovrapposti. Poteva succedere ridimensionando un
 * bordo già sul margine della board (bug in board-resize.ts, corretto,
 * ma può aver già scritto dati non validi su un layout salvato prima
 * della correzione). Se è già tutto valido lo ritorna invariato senza
 * toccare nulla; altrimenti lo ricostruisce da capo con lo stesso
 * bin-packing usato per i layout legacy, mantenendo tipo e dimensione
 * (clampata a min/max) di ogni blocco — si scartano solo le posizioni,
 * si ripiazzano da zero nell'ordine in cui erano salvate.
 */
export function sanitizeLayout(layout: readonly WidgetPlacement[]): WidgetPlacement[] {
  const isValid = (p: WidgetPlacement) => p.x >= 0 && p.y >= 0 && p.x + p.w <= BOARD_COLS
  const hasOverlap = layout.some((a, i) => layout.some((b, j) => i < j && placementsOverlap(a, b)))
  if (layout.every(isValid) && !hasOverlap) return layout as WidgetPlacement[]

  const rebuilt: WidgetPlacement[] = []
  for (const p of layout) {
    const meta = WIDGET_META[p.type]
    const w = Math.min(meta.maxW, Math.max(meta.minW, p.w))
    const h = Math.min(meta.maxH, Math.max(meta.minH, p.h))
    const { x, y } = findFreeSpot(rebuilt, w, h)
    rebuilt.push({ type: p.type, x, y, w, h })
  }
  return rebuilt
}

/** Piazza una sequenza di blocchi in ordine, uno via via nel primo posto libero. */
function packInOrder(types: readonly WidgetType[]): WidgetPlacement[] {
  const layout: WidgetPlacement[] = []
  for (const type of types) {
    const meta = WIDGET_META[type]
    const { x, y } = findFreeSpot(layout, meta.w, meta.h)
    layout.push({ type, x, y, w: meta.w, h: meta.h })
  }
  return layout
}

export const DEFAULT_LAYOUT_PLACEMENT: WidgetPlacement[] = packInOrder([
  "agenda",
  "mail",
  ...DEFAULT_LAYOUT,
])

/**
 * Migrazione automatica, in lettura: le board create prima dell'introduzione
 * della griglia logica hanno solo `order` (WidgetType[]) e `sizes`
 * ("1x1"|"2x1"|"1x2"|"2x2" per tipo) — nessun x/y. Ricostruisce un
 * WidgetPlacement[] equivalente piazzando i blocchi nell'ordine salvato,
 * convertendo ogni taglia legacy nel w/h corrispondente. Va bene invocarla
 * a ogni lettura finché il layout non è stato salvato almeno una volta:
 * è deterministica e non distrugge nulla.
 */
export function migrateLegacyLayout(
  order: readonly string[],
  sizes: Record<string, string>,
): WidgetPlacement[] {
  const types = order.filter(isWidgetType)
  const layout: WidgetPlacement[] = []
  for (const type of types) {
    const meta = WIDGET_META[type]
    const legacy = sizes[type]
    // Le taglie legacy erano sempre "<cols>x<righe>" con cifra esplicita
    // (1 o 2): se c'è un override si legge da lì, altrimenti dal default
    // nuovo — non "altrimenti 1" (bug preso e corretto in questa sessione:
    // "1x1"/"1x2" finivano comunque sulla taglia di default nuova, non 1).
    // Clampata ai min/max attuali: un override legacy (es. mail "1x1") può
    // essere sotto il minimo che il widget ha oggi (mail ora ha minW 2 per
    // via delle 3 tab) — senza il clamp partirebbe già fuori dai suoi stessi
    // vincoli.
    const legacyW = legacy ? (legacy.startsWith("2") ? 2 : 1) : meta.w
    const legacyH = legacy ? (legacy.endsWith("2") ? 2 : 1) : meta.h
    const w = Math.min(meta.maxW, Math.max(meta.minW, legacyW))
    const h = Math.min(meta.maxH, Math.max(meta.minH, legacyH))
    const { x, y } = findFreeSpot(layout, w, h)
    layout.push({ type, x, y, w, h })
  }
  return layout
}

/** Layout della board: posizione di ogni blocco sulla griglia logica. */
export type BoardState = {
  layout: WidgetPlacement[]
  railCollapsed: boolean
  habitList: string[]
}

export const DEFAULT_BOARD_STATE: BoardState = {
  layout: DEFAULT_LAYOUT_PLACEMENT,
  railCollapsed: false,
  habitList: [...DEFAULT_HABITS],
}

/**
 * BoardState + quale SavedLayout è attivo — quello che il client vede
 * davvero (railCollapsed/habitList restano condivisi tra layout, solo
 * `layout` cambia col nome scelto, Fase 5.4).
 */
export type ActiveBoardState = BoardState & { layoutId: string; layoutName: string }

/** Un layout salvato, per lo switcher — senza il contenuto (pesante,
 * serve solo quando lo attivi). */
export type SavedLayoutSummary = { id: string; name: string; isActive: boolean }

/** MIME per trascinare un blocco dalla libreria sulla board. */
export const DND_MIME = "application/x-dailyhub-widget"
/** MIME per trascinare un blocco già sulla board per riordinarlo. */
export const REORDER_MIME = "application/x-dailyhub-reorder"

export function isLibraryWidget(value: string): value is WidgetType {
  return (LIBRARY_WIDGETS as readonly string[]).includes(value)
}

export function isWidgetType(value: string): value is WidgetType {
  return value in WIDGET_META
}
