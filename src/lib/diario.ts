import { chiaveGiorno } from "@/lib/datetime"

export const MOODS = ["Difficile", "Così così", "Neutro", "Buono", "Ottimo"] as const
export type Mood = (typeof MOODS)[number]

export type DiarioState = {
  mood: Mood | null
  obiettivo: string
  testo: string
  wins: [string, string, string]
}

export const DIARIO_EMPTY: DiarioState = {
  mood: null,
  obiettivo: "",
  testo: "",
  wins: ["", "", ""],
}

export function diarioKey(date = new Date()): string {
  return `dailyhub:diario:${chiaveGiorno(date)}`
}
