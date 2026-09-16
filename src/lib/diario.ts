export const MOODS = ["Difficile", "Così così", "Neutro", "Buono", "Ottimo"] as const
export type Mood = (typeof MOODS)[number]

/**
 * Record unico del giorno per il widget "Diario": journaling, abitudini,
 * peso, sonno, umore — non più blocchi separati (vedi board.ts). `habits`
 * è lo stato "fatta/non fatta" di oggi, per nome; la lista dei nomi vive nel
 * BoardLayout (`habitList`), condivisa tra i giorni.
 */
export type DiarioState = {
  mood: Mood | null
  obiettivo: string
  testo: string
  wins: [string, string, string]
  habits: Record<string, boolean>
  weight: number | null
  sleepHours: number | null
  /** Sessioni di studio completate oggi — vedi widget Pomodoro. */
  pomodoroSessions: number
}

export const DIARIO_EMPTY: DiarioState = {
  mood: null,
  obiettivo: "",
  testo: "",
  wins: ["", "", ""],
  habits: {},
  weight: null,
  sleepHours: null,
  pomodoroSessions: 0,
}

// Punto di partenza ispirato a un tracker reale: personalizzabile da qui in poi.
export const DEFAULT_HABITS: readonly string[] = [
  "Skincare",
  "Studio 2h",
  "Lettura 10 pag",
  "Journaling",
]

/** Un giorno con una riga in DB ma tutti i campi al valore di default —
 * es. un JournalEntry creato solo per contare un pomodoro, mai aperto per
 * scrivere — conta come "nessuna voce" per chi guarda, non come un giorno
 * con contenuto. Spostata qui (prima viveva in diario-day-summary.tsx,
 * un componente) perché ora serve anche a lib/queries/diario.ts (streak
 * e riepilogo Andamento): un file di sola logica non deve dipendere da
 * un file di UI. */
export function isDiarioEntryEmpty(entry: DiarioState): boolean {
  return (
    !entry.mood &&
    !entry.obiettivo &&
    !entry.testo &&
    Object.keys(entry.habits).length === 0 &&
    entry.weight == null &&
    entry.sleepHours == null &&
    entry.pomodoroSessions === 0
  )
}

/** Colore del pallino umore — condiviso tra il pannello Cronologia a 7
 * giorni e la Cronologia estesa (history-explorer.tsx). */
export function moodDotClass(mood?: Mood | null): string {
  if (mood === "Difficile") return "bg-destructive"
  if (mood === "Così così" || mood === "Neutro") return "bg-ink-faint"
  if (mood === "Buono" || mood === "Ottimo") return "bg-good"
  return "bg-border"
}

/** Stessa scala di moodDotClass, come classe `text-*` invece di `bg-*` —
 * serve dove il colore va applicato a `currentColor` (icone SVG a mano,
 * stroke/fill dei grafici Andamento) invece che a uno sfondo. */
export function moodTextColorClass(mood?: Mood | null): string {
  if (mood === "Difficile") return "text-destructive"
  if (mood === "Così così" || mood === "Neutro") return "text-ink-faint"
  if (mood === "Buono" || mood === "Ottimo") return "text-good"
  return "text-border"
}

/**
 * Riga di riepilogo per un giorno in Cronologia (pannello a 7 giorni e
 * Cronologia estesa) — testo/obiettivo hanno la priorità (è quello scritto
 * a mano), ma un giorno con sessioni Pomodoro registrate e nessuna riga di
 * diario non è "nessuna voce": c'è comunque qualcosa da mostrare. null solo
 * se non è stato registrato davvero niente quel giorno.
 */
export function daySummary(entry?: DiarioState): string | null {
  if (!entry) return null
  if (entry.obiettivo) return entry.obiettivo
  if (entry.testo) return entry.testo
  if (entry.pomodoroSessions > 0) {
    return `${entry.pomodoroSessions} ${entry.pomodoroSessions === 1 ? "pomodoro" : "pomodori"}`
  }
  return null
}
