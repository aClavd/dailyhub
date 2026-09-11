"use client"

import { useCallback, useRef, useState, useTransition } from "react"

import { saveDiarioEntry } from "@/lib/actions/diario"
import { chiaveGiorno } from "@/lib/datetime"
import { MOODS, type DiarioState } from "@/lib/diario"

import { FieldLabel, Segmented, inputClass, textareaClass } from "./_shared"

const SAVE_DELAY_MS = 600

export function DiarioWidget({ initial }: { initial: DiarioState }) {
  const [state, setState] = useState<DiarioState>(initial)
  const [, startTransition] = useTransition()
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const persist = useCallback((next: DiarioState, immediate: boolean) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    const run = () => startTransition(() => void saveDiarioEntry(chiaveGiorno(), next))
    if (immediate) run()
    else saveTimer.current = setTimeout(run, SAVE_DELAY_MS)
  }, [])

  const patch = (part: Partial<DiarioState>, immediate = false) => {
    const next = { ...state, ...part }
    setState(next)
    persist(next, immediate)
  }

  return (
    <div>
      <FieldLabel>Umore</FieldLabel>
      <Segmented
        label="Umore di oggi"
        options={MOODS}
        value={state.mood}
        onChange={(mood) => patch({ mood }, true)}
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
