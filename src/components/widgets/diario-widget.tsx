"use client"

import { useCallback, useRef, useState, useTransition } from "react"

import { useBoard } from "@/components/board/board-context"
import { saveDiarioEntry } from "@/lib/actions/diario"
import { dataBreve, chiaveGiorno } from "@/lib/datetime"
import { MOODS, type DiarioState, type Mood } from "@/lib/diario"

import { CheckRow, FieldLabel, Segmented, textareaClass } from "./_shared"

const SAVE_DELAY_MS = 600

/**
 * Widget "Diario" unificato: un solo record al giorno per journaling,
 * abitudini, peso, sonno e umore — non più 4 blocchi separati. Sezioni
 * impilate con un separatore leggero (border-top), niente card multiple —
 * visivamente resta un unico blocco, ma è scomposto in sotto-componenti
 * (DiaryHeader/JournalSection/HabitSection/QuickStats) qui sotto.
 */
export function DiarioWidget({
  initial,
  dayNumber,
}: {
  initial: DiarioState
  dayNumber: number
}) {
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
    <div className="flex flex-col gap-4">
      <DiaryHeader dayNumber={dayNumber} />

      <JournalSection testo={state.testo} onChange={(testo) => patch({ testo })} />

      <HabitSection
        habits={state.habits}
        onToggle={(name) =>
          patch({ habits: { ...state.habits, [name]: !state.habits[name] } }, true)
        }
      />

      <QuickStats
        mood={state.mood}
        weight={state.weight}
        sleepHours={state.sleepHours}
        onMood={(mood) => patch({ mood }, true)}
        onWeight={(weight) => patch({ weight })}
        onSleep={(sleepHours) => patch({ sleepHours })}
      />
    </div>
  )
}

function DiaryHeader({ dayNumber }: { dayNumber: number }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-ink-faint font-mono text-[0.68rem] tracking-wide uppercase">
        Giorno {dayNumber}
      </span>
      <span className="text-ink-faint font-mono text-[0.68rem] tracking-wide uppercase">
        {dataBreve()}
      </span>
    </div>
  )
}

function JournalSection({
  testo,
  onChange,
}: {
  testo: string
  onChange: (value: string) => void
}) {
  return (
    <div>
      <FieldLabel>Diario</FieldLabel>
      <textarea
        className={textareaClass("heading")}
        rows={4}
        value={testo}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Com'è andata oggi…"
      />
    </div>
  )
}

function HabitSection({
  habits,
  onToggle,
}: {
  habits: Record<string, boolean>
  onToggle: (name: string) => void
}) {
  const { habitList, addHabit, removeHabit } = useBoard()
  const [draft, setDraft] = useState("")

  const submit = () => {
    const label = draft.trim()
    if (!label) return
    addHabit(label)
    setDraft("")
  }

  return (
    <div className="border-border border-t pt-4">
      <FieldLabel>Abitudini</FieldLabel>
      {habitList.length === 0 ? (
        <p className="text-ink-faint text-[0.72rem]">
          Nessuna abitudine ancora — aggiungine una qui sotto.
        </p>
      ) : (
        habitList.map((name) => (
          <CheckRow
            key={name}
            label={name}
            done={Boolean(habits[name])}
            onToggle={() => onToggle(name)}
            onRemove={() => removeHabit(name)}
          />
        ))
      )}
      <div className="mt-2 flex gap-1.5">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              submit()
            }
          }}
          placeholder="Nuova abitudine…"
          className="bg-muted border-border focus:outline-primary min-w-0 flex-1 rounded-md border px-2 py-1 text-xs focus:outline-2"
        />
        <button
          type="button"
          onClick={submit}
          aria-label="Aggiungi abitudine"
          className="border-border text-ink-soft hover:text-foreground shrink-0 rounded-md border px-2 text-sm"
        >
          +
        </button>
      </div>
    </div>
  )
}

function QuickStats({
  mood,
  weight,
  sleepHours,
  onMood,
  onWeight,
  onSleep,
}: {
  mood: Mood | null
  weight: number | null
  sleepHours: number | null
  onMood: (mood: Mood) => void
  onWeight: (value: number | null) => void
  onSleep: (value: number | null) => void
}) {
  return (
    <div className="border-border border-t pt-4">
      <FieldLabel>Quick stats</FieldLabel>
      <Segmented label="Umore di oggi" options={MOODS} value={mood} onChange={onMood} />
      <div className="mt-3 grid grid-cols-2 gap-3">
        <MiniStat label="Peso" unit="kg" step={0.1} value={weight} onChange={onWeight} />
        <MiniStat label="Sonno" unit="h" step={0.5} value={sleepHours} onChange={onSleep} />
      </div>
    </div>
  )
}

function MiniStat({
  label,
  unit,
  step,
  value,
  onChange,
}: {
  label: string
  unit: string
  step: number
  value: number | null
  onChange: (value: number | null) => void
}) {
  return (
    <div className="border-border rounded-lg border px-2.5 py-2">
      <span className="text-ink-faint block text-[0.62rem] tracking-wide uppercase">
        {label}
      </span>
      <div className="flex items-baseline gap-1">
        <input
          type="number"
          inputMode="decimal"
          step={step}
          value={value ?? ""}
          onChange={(event) => {
            const raw = event.target.value
            onChange(raw === "" ? null : Number(raw))
          }}
          placeholder="—"
          className="font-mono w-14 border-0 bg-transparent p-0 text-lg font-medium tabular-nums outline-none placeholder:text-ink-faint"
        />
        <span className="text-ink-faint text-xs">{unit}</span>
      </div>
    </div>
  )
}

