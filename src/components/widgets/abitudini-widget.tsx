"use client"

import { useState } from "react"

import { chiaveGiorno } from "@/lib/datetime"
import { useLocalStorage } from "@/lib/use-local-storage"

import { CheckRow } from "./_shared"

type Habit = { id: string; label: string }

// Punto di partenza ispirato a un tracker reale: personalizzabile da qui in poi.
const DEFAULT_HABITS: Habit[] = [
  { id: "skincare", label: "Skincare" },
  { id: "studio", label: "Studio 2h" },
  { id: "lettura", label: "Lettura 10 pag" },
  { id: "journaling", label: "Journaling" },
]

export function AbitudiniWidget() {
  const [habits, setHabits] = useLocalStorage<Habit[]>(
    "dailyhub:abitudini:list",
    DEFAULT_HABITS,
  )
  const [done, setDone] = useLocalStorage<Record<string, boolean>>(
    `dailyhub:abitudini:${chiaveGiorno()}`,
    {},
  )
  const [draft, setDraft] = useState("")
  const list = Array.isArray(habits) ? habits : DEFAULT_HABITS

  const addHabit = () => {
    const label = draft.trim()
    if (!label) return
    setHabits([...list, { id: `h${Date.now()}`, label }])
    setDraft("")
  }

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {list.length === 0 ? (
          <p className="text-ink-faint text-[0.72rem]">
            Nessuna abitudine ancora — aggiungine una qui sotto.
          </p>
        ) : (
          list.map((habit) => (
            <CheckRow
              key={habit.id}
              label={habit.label}
              done={Boolean(done?.[habit.id])}
              onToggle={() =>
                setDone((prev) => ({ ...prev, [habit.id]: !prev?.[habit.id] }))
              }
              onRemove={() => setHabits(list.filter((h) => h.id !== habit.id))}
            />
          ))
        )}
      </div>
      <div className="border-border mt-2 flex gap-1.5 border-t pt-2">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              addHabit()
            }
          }}
          placeholder="Nuova abitudine…"
          className="bg-muted border-border focus:outline-primary min-w-0 flex-1 rounded-md border px-2 py-1 text-xs focus:outline-2"
        />
        <button
          type="button"
          onClick={addHabit}
          aria-label="Aggiungi abitudine"
          className="border-border text-ink-soft hover:text-foreground shrink-0 rounded-md border px-2 text-sm"
        >
          +
        </button>
      </div>
    </div>
  )
}
