"use client"

import { chiaveGiorno } from "@/lib/datetime"
import { useLocalStorage } from "@/lib/use-local-storage"

import { CheckRow } from "./_shared"

const HABITS = [
  { id: "lettura", label: "Lettura 20 min" },
  { id: "acqua", label: "2 litri d'acqua" },
  { id: "social", label: "Niente social prima delle 10" },
  { id: "stretch", label: "Stretching 5 min" },
]

export function AbitudiniWidget() {
  const [done, setDone] = useLocalStorage<Record<string, boolean>>(
    `dailyhub:abitudini:${chiaveGiorno()}`,
    {},
  )

  return (
    <div className="flex flex-col">
      {HABITS.map((habit) => (
        <CheckRow
          key={habit.id}
          label={habit.label}
          done={Boolean(done?.[habit.id])}
          onToggle={() =>
            setDone((prev) => ({ ...prev, [habit.id]: !prev?.[habit.id] }))
          }
        />
      ))}
    </div>
  )
}
