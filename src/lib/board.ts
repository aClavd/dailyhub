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
  // "mail" passa a 2x2 quando in Fase 3 avrà contenuto vero.
  mail: { title: "Mail importanti", desc: "Gmail + Libero", size: "2x1" },
  diario: { title: "Diario di oggi", desc: "journaling + umore", size: "2x2" },
  pomodoro: { title: "Studio · Pomodoro", desc: "timer 25 / 5", size: "1x1" },
  abitudini: { title: "Abitudini", desc: "spunta del giorno", size: "1x2" },
  note: { title: "Note rapide", desc: "un pensiero al volo", size: "1x1" },
  obiettivi: { title: "Obiettivi della settimana", desc: "3 cose che contano", size: "1x2" },
  lettura: { title: "Lettura", desc: "libro in corso", size: "1x1" },
  acqua: { title: "Acqua", desc: "bicchieri di oggi", size: "1x1" },
  meteo: { title: "Meteo", desc: "oggi, in breve", size: "1x1" },
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
