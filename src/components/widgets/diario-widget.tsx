"use client"

import { chiaveGiorno } from "@/lib/datetime"
import { useLocalStorage } from "@/lib/use-local-storage"

import { FieldLabel, Segmented, inputClass, textareaClass } from "./_shared"

const MOODS = ["Difficile", "Così così", "Neutro", "Buono", "Ottimo"] as const
type Mood = (typeof MOODS)[number]

type DiarioState = {
  mood: Mood | null
  obiettivo: string
  testo: string
  wins: [string, string, string]
}

const EMPTY: DiarioState = {
  mood: null,
  obiettivo: "",
  testo: "",
  wins: ["", "", ""],
}

export function DiarioWidget() {
  const [stored, setStored] = useLocalStorage<DiarioState>(
    `dailyhub:diario:${chiaveGiorno()}`,
    EMPTY,
  )
  const state: DiarioState = {
    ...EMPTY,
    ...stored,
    wins: (stored?.wins ?? EMPTY.wins).slice(0, 3) as [string, string, string],
  }

  const patch = (part: Partial<DiarioState>) =>
    setStored((prev) => ({ ...EMPTY, ...prev, ...part }))

  return (
    <div>
      <FieldLabel>Umore</FieldLabel>
      <Segmented
        label="Umore di oggi"
        options={MOODS}
        value={state.mood}
        onChange={(mood) => patch({ mood })}
      />

      <FieldLabel>Obiettivo del giorno</FieldLabel>
      <input
        className={inputClass}
        value={state.obiettivo}
        onChange={(event) => patch({ obiettivo: event.target.value })}
        placeholder="Una cosa che vuoi portare a casa oggi"
      />

      <FieldLabel>Pagina di oggi</FieldLabel>
      <textarea
        className={textareaClass("heading")}
        rows={5}
        value={state.testo}
        onChange={(event) => patch({ testo: event.target.value })}
        placeholder="Com'è andata?"
      />

      <FieldLabel>3 cose andate bene</FieldLabel>
      <div className="flex flex-col gap-1.5">
        {[0, 1, 2].map((i) => (
          <input
            key={i}
            className={inputClass}
            value={state.wins[i]}
            onChange={(event) => {
              const wins = [...state.wins] as [string, string, string]
              wins[i] = event.target.value
              patch({ wins })
            }}
            placeholder={`#${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
