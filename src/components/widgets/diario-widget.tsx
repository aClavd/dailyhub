"use client"

import { useCallback, useRef, useState, useTransition } from "react"

import { useBoard } from "@/components/board/board-context"
import { fetchDiarioEntry } from "@/lib/actions/history"
import { saveDiarioEntry } from "@/lib/actions/diario"
import { addDays, chiaveGiorno, dataBreve, parseChiave } from "@/lib/datetime"
import { MOODS, type DiarioState, type Mood } from "@/lib/diario"

import { CheckRow, FieldLabel, Segmented, textareaClass } from "./_shared"

const SAVE_DELAY_MS = 600

/**
 * Widget "Diario" unificato: un solo record al giorno per journaling,
 * abitudini, peso, sonno e umore — non più 4 blocchi separati. Sezioni
 * impilate con un separatore leggero (border-top), niente card multiple —
 * visivamente resta un unico blocco, ma è scomposto in sotto-componenti
 * (DiaryHeader/JournalSection/HabitSection/QuickStats) qui sotto.
 *
 * `‹`/`›` in testata spostano quale giorno si sta modificando (mai il
 * futuro): utile se un giorno te lo sei perso e vuoi scriverlo dopo.
 * `saveDiarioEntry`/`fetchDiarioEntry` prendono già una data qualsiasi
 * (non "oggi" fisso) — erano già pronte per questo, costruite così fin
 * dalla Cronologia estesa.
 */
export function DiarioWidget({
  initial,
  dayNumber,
  todayKey,
}: {
  initial: DiarioState
  dayNumber: number
  todayKey: string
}) {
  const [editingDate, setEditingDate] = useState(todayKey)
  const [state, setState] = useState<DiarioState>(initial)
  const [, startTransition] = useTransition()
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Il salvataggio vero (debounced) — tenuto anche qui, non solo nel
  // timer, per poterlo far scattare subito se si cambia giorno prima che
  // i 600ms passino da soli (altrimenti l'ultima modifica andrebbe persa,
  // mai salvata: bug reale a cui ho pensato scrivendo questo, non trovato
  // dal vivo ma facile da immaginare — scrivi, cambi subito giorno).
  const pendingRun = useRef<(() => void) | null>(null)

  const persist = useCallback((next: DiarioState, date: string, immediate: boolean) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    const run = () => {
      pendingRun.current = null
      startTransition(() => void saveDiarioEntry(date, next))
    }
    pendingRun.current = run
    if (immediate) run()
    else saveTimer.current = setTimeout(run, SAVE_DELAY_MS)
  }, [])

  const patch = (part: Partial<DiarioState>, immediate = false) => {
    const next = { ...state, ...part }
    setState(next)
    persist(next, editingDate, immediate)
  }

  function goTo(date: string) {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
      saveTimer.current = null
    }
    pendingRun.current?.() // salva subito quello che c'era in sospeso, sulla data vecchia
    setEditingDate(date)
    if (date === todayKey) {
      setState(initial) // già in mano da page.tsx, nessun giro di rete
      return
    }
    startTransition(async () => {
      setState(await fetchDiarioEntry(date))
    })
  }

  const isToday = editingDate === todayKey

  return (
    <div className="flex flex-col gap-4">
      <DiaryHeader
        dayNumber={dayNumber}
        editingDate={editingDate}
        isToday={isToday}
        onPrev={() => goTo(chiaveGiorno(addDays(parseChiave(editingDate), -1)))}
        onNext={() => goTo(chiaveGiorno(addDays(parseChiave(editingDate), 1)))}
      />

      <JournalSection testo={state.testo} onChange={(testo) => patch({ testo })} />

      <HabitSection
        habits={state.habits}
        onToggle={(name) =>
          patch({ habits: { ...state.habits, [name]: !state.habits[name] } }, true)
        }
      />

      <QuickStats
        isToday={isToday}
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

function DiaryHeader({
  dayNumber,
  editingDate,
  isToday,
  onPrev,
  onNext,
}: {
  dayNumber: number
  editingDate: string
  isToday: boolean
  onPrev: () => void
  onNext: () => void
}) {
  // Prima erano "‹"/"›" a size-5 (20px) e text-ink-faint (colore attenuato
  // sempre, anche a riposo) — quasi invisibili, segnalato da Claudio.
  // Stesso stile già usato per avanti/indietro nella Cronologia estesa
  // (history-explorer.tsx, goPrev/goNext): bordo visibile, size-6, colore
  // pieno di default, non solo all'hover.
  const navButton =
    "border-border text-ink-soft hover:text-foreground grid size-6 shrink-0 place-items-center rounded-md border text-sm disabled:opacity-30"
  return (
    <div className="flex items-center justify-between gap-1.5">
      <button type="button" onClick={onPrev} aria-label="Giorno precedente" className={navButton}>
        ‹
      </button>
      <span className="text-ink-faint min-w-0 flex-1 truncate text-center font-mono text-[0.68rem] tracking-wide uppercase">
        {isToday ? `Giorno ${dayNumber} · oggi` : dataBreve(parseChiave(editingDate))}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={isToday}
        aria-label="Torna a oggi"
        title={isToday ? undefined : "Torna a oggi"}
        className={navButton}
      >
        ›
      </button>
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
  isToday,
  mood,
  weight,
  sleepHours,
  onMood,
  onWeight,
  onSleep,
}: {
  isToday: boolean
  mood: Mood | null
  weight: number | null
  sleepHours: number | null
  onMood: (mood: Mood) => void
  onWeight: (value: number | null) => void
  onSleep: (value: number | null) => void
}) {
  return (
    <div className="border-border border-t pt-4">
      {/* Era "Quick stats" — non diceva niente su cosa fosse né che peso/
          sonno si possono lasciare vuoti. Nome letterale + il placeholder
          di MiniStat ("non lo so", sotto) fanno il lavoro insieme: non
          serve una nota a parte per dire "facoltativo". */}
      <FieldLabel>Umore, peso, sonno</FieldLabel>
      <Segmented
        label={isToday ? "Umore di oggi" : "Umore"}
        options={MOODS}
        value={mood}
        onChange={onMood}
      />
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
          // "non lo so", non "—": dice chiaramente che lasciarlo vuoto è
          // una scelta valida (non hai controllato quel giorno), non solo
          // l'aspetto grafico di un campo senza valore — è il punto che
          // Claudio ha segnalato non essere chiaro dalla sola UI.
          placeholder="non lo so"
          // w-14 (56px) andava bene per "—" ma tagliava "non lo so" a metà
          // ("non lo") — trovato guardando lo screenshot di verifica, non
          // segnalato da Claudio. w-20 ci sta comoda in font mono.
          className="font-mono w-20 border-0 bg-transparent p-0 text-lg font-medium tabular-nums outline-none placeholder:text-ink-faint placeholder:text-[0.7rem] placeholder:tracking-tight"
        />
        <span className="text-ink-faint text-xs">{unit}</span>
      </div>
    </div>
  )
}
