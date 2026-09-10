export type WidgetType =
  | "agenda"
  | "mail"
  | "diario"
  | "pomodoro"
  | "abitudini"
  | "note"
  | "obiettivi"
  | "lettura"
  | "acqua"
  | "meteo"

export type WidgetMeta = {
  title: string
  /** Testo breve mostrato nella libreria. */
  desc: string
  /** Larghezza in colonne della board. */
  span: 1 | 2
}

export const WIDGET_META: Record<WidgetType, WidgetMeta> = {
  agenda: { title: "Impegni di oggi", desc: "eventi di Google Calendar", span: 1 },
  mail: { title: "Mail importanti", desc: "Gmail + Libero", span: 2 },
  diario: { title: "Diario di oggi", desc: "journaling + umore", span: 2 },
  pomodoro: { title: "Studio · Pomodoro", desc: "timer 25 / 5", span: 1 },
  abitudini: { title: "Abitudini", desc: "spunta del giorno", span: 1 },
  note: { title: "Note rapide", desc: "un pensiero al volo", span: 1 },
  obiettivi: { title: "Obiettivi della settimana", desc: "3 cose che contano", span: 1 },
  lettura: { title: "Lettura", desc: "libro in corso", span: 1 },
  acqua: { title: "Acqua", desc: "bicchieri di oggi", span: 1 },
  meteo: { title: "Meteo", desc: "oggi, in breve", span: 1 },
}

/** Blocchi sempre presenti, non rimovibili. */
export const FIXED_WIDGETS: readonly WidgetType[] = ["agenda", "mail"]

/** Blocchi trascinabili dalla libreria. */
export const LIBRARY_WIDGETS: readonly WidgetType[] = [
  "diario",
  "pomodoro",
  "abitudini",
  "note",
  "obiettivi",
  "lettura",
  "acqua",
  "meteo",
]

/** Layout iniziale (solo i blocchi di libreria; i fissi sono impliciti). */
export const DEFAULT_LAYOUT: WidgetType[] = ["diario", "pomodoro", "abitudini"]

export const BOARD_STORAGE_KEY = "dailyhub:board"
export const RAIL_STORAGE_KEY = "dailyhub:rail"
export const DND_MIME = "application/x-dailyhub-widget"

export function isLibraryWidget(value: string): value is WidgetType {
  return (LIBRARY_WIDGETS as readonly string[]).includes(value)
}
