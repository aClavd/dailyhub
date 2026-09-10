"use client"

import { chiaveSettimana } from "@/lib/datetime"
import { useLocalStorage } from "@/lib/use-local-storage"
import { cn } from "@/lib/utils"

import { inputClass } from "./_shared"

type Goal = { text: string; done: boolean }

const EMPTY: Goal[] = [
  { text: "", done: false },
  { text: "", done: false },
  { text: "", done: false },
]

export function ObiettiviWidget() {
  const [goals, setGoals] = useLocalStorage<Goal[]>(
    `dailyhub:obiettivi:${chiaveSettimana()}`,
    EMPTY,
  )
  const list = Array.isArray(goals) && goals.length === 3 ? goals : EMPTY

  const patch = (index: number, part: Partial<Goal>) =>
    setGoals(list.map((goal, i) => (i === index ? { ...goal, ...part } : goal)))

  return (
    <div className="flex flex-col gap-2">
      {list.map((goal, i) => (
        <div key={i} className="flex items-center gap-2">
          <button
            type="button"
            aria-pressed={goal.done}
            aria-label={`Obiettivo ${i + 1} completato`}
            onClick={() => patch(i, { done: !goal.done })}
            className={cn(
              "grid size-[15px] shrink-0 place-items-center rounded border text-[10px] transition-colors",
              goal.done
                ? "bg-primary border-primary text-primary-foreground"
                : "border-ink-faint text-transparent",
            )}
          >
            ✓
          </button>
          <input
            className={cn(
              inputClass,
              "py-1.5",
              goal.done && "text-ink-faint line-through",
            )}
            value={goal.text}
            onChange={(event) => patch(i, { text: event.target.value })}
            placeholder={`Obiettivo ${i + 1}`}
          />
        </div>
      ))}
    </div>
  )
}
