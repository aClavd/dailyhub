import { DEFAULT_HABITS } from "@/lib/diario"

export type WidgetType =
  | "agenda"
  | "mail"
  | "diario"
  | "pomodoro"
  | "note"
  | "obiettivi"
  | "lettura"
  | "acqua"
  | "meteo"

/**
 * Dimensione in celle della griglia, come i widget del Centro di Controllo:
 * ogni blocco occupa un rettangolo fisso di celle (colonne × righe).
 */
export type WidgetSize = "1x1" | "2x1" | "1x2" | "2x2"

export type WidgetMeta = {
  title: string
  /** Testo breve mostrato nella libreria. */
  desc: string
  size: WidgetSize
}

export const WIDGET_META: Record<WidgetType, WidgetMeta> = {
  agenda: { title: "Impegni di oggi", desc: "eventi di Google Calendar", size: "2x2" },
  mail: { title: "Mail importanti", desc: "Gmail + Libero", size: "2x2" },
  diario: {
    title: "Diario di oggi",
    desc: "journaling, abitudini, peso, sonno, umore",
    size: "2x2",
  },
  pomodoro: { title: "Studio · Pomodoro", desc: "timer 25 / 5", size: "1x1" },
  note: { title: "Note rapide", desc: "un pensiero al volo", size: "1x1" },
  obiettivi: { title: "Obiettivi della settimana", desc: "3 cose che contano", size: "1x2" },
  lettura: { title: "Lettura", desc: "libro in corso", size: "1x1" },
  acqua: { title: "Acqua", desc: "bicchieri di oggi", size: "1x1" },
  meteo: { title: "Meteo", desc: "oggi, in breve", size: "1x1" },
}

/** Blocchi sempre presenti, non rimovibili (ma spostabili). */
export const FIXED_WIDGETS: readonly WidgetType[] = ["agenda", "mail"]

/** Blocchi trascinabili dalla libreria. */
export const LIBRARY_WIDGETS: readonly WidgetType[] = [
  "diario",
  "pomodoro",
  "note",
  "obiettivi",
  "lettura",
  "acqua",
  "meteo",
]

/** Blocchi di libreria presenti sulla board al primo avvio. */
export const DEFAULT_LAYOUT: WidgetType[] = ["diario", "pomodoro"]

/** Ordine completo iniziale: fissi + layout di default, in quest'ordine. */
export const DEFAULT_ORDER: WidgetType[] = [...FIXED_WIDGETS, ...DEFAULT_LAYOUT]

/** Layout della board: quali blocchi, in che ordine, con che taglia. */
export type BoardState = {
  order: WidgetType[]
  sizes: Partial<Record<WidgetType, WidgetSize>>
  railCollapsed: boolean
  /** Nomi delle abitudini del widget Diario, condivisi tra tutti i giorni. */
  habitList: string[]
}

export const DEFAULT_BOARD_STATE: BoardState = {
  order: DEFAULT_ORDER,
  sizes: {},
  railCollapsed: false,
  habitList: [...DEFAULT_HABITS],
}

/** In che ordine si passa da una taglia alla successiva col pulsante ridimensiona. */
export const SIZE_CYCLE: readonly WidgetSize[] = ["1x1", "2x1", "2x2", "1x2"]

/** MIME per trascinare un blocco dalla libreria sulla board. */
export const DND_MIME = "application/x-dailyhub-widget"
/** MIME per trascinare un blocco già sulla board per riordinarlo. */
export const REORDER_MIME = "application/x-dailyhub-reorder"

export function sizeCols(size: WidgetSize): 1 | 2 {
  return size === "2x1" || size === "2x2" ? 2 : 1
}

export function sizeRows(size: WidgetSize): 1 | 2 {
  return size === "1x2" || size === "2x2" ? 2 : 1
}

export function makeSize(cols: 1 | 2, rows: 1 | 2): WidgetSize {
  return `${cols}x${rows}` as WidgetSize
}

export function isLibraryWidget(value: string): value is WidgetType {
  return (LIBRARY_WIDGETS as readonly string[]).includes(value)
}

export function isWidgetType(value: string): value is WidgetType {
  return value in WIDGET_META
}
