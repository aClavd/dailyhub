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
