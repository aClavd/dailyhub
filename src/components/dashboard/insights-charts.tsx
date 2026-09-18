"use client"

import type { ReactNode } from "react"

import { DURATIONS } from "@/components/widgets/pomodoro-widget"
import { dataBreve } from "@/lib/datetime"
import { moodTextColorClass, type DiarioState } from "@/lib/diario"
import type { DiarioStreaks } from "@/lib/queries/diario"
import { cn } from "@/lib/utils"

// Grafici della scheda Andamento (insights-dialog.tsx) — SVG scritti a
// mano, coerenti col resto del progetto (niente libreria di charting per
// 5 grafici semplici). Ogni grafico gestisce da solo lo stato vuoto: mai
// un asse con dati finti o interpolati solo per riempire lo spazio.
//
// Stesso viewBox per tutti (280×84): scala con `w-full h-auto`, il
// rapporto si mantiene qualunque sia la larghezza reale della colonna.
const W = 280
const H = 84
const PAD_X = 8
const PAD_Y = 10

function xAt(index: number, count: number): number {
  if (count <= 1) return W / 2
  return PAD_X + (index / (count - 1)) * (W - 2 * PAD_X)
}

function yAt(value: number, min: number, max: number): number {
  if (max === min) return H / 2
  const t = (value - min) / (max - min)
  return H - PAD_Y - t * (H - 2 * PAD_Y)
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-border rounded-lg border p-3">
      <p className="text-ink-faint text-[0.62rem] font-semibold tracking-[0.08em] uppercase">{title}</p>
      <div className="mt-2">{children}</div>
    </div>
  )
}

function EmptyChart({ label = "Non ci sono ancora abbastanza dati per questo periodo." }: { label?: string }) {
  return <p className="text-ink-faint py-6 text-center text-xs italic">{label}</p>
}

type DayEntry = { date: Date; entry?: DiarioState }

/**
 * Umore nel tempo — striscia di punti colorati (stessa scala di
 * moodDotClass) sulla loro vera posizione cronologica nel periodo, non un
 * grafico a linea: l'umore è una scala qualitativa, collegare i punti con
 * una linea implicherebbe un andamento continuo che i dati non hanno
 * (specialmente tra due giorni registrati lontani nel periodo).
 */
export function MoodChart({ days }: { days: DayEntry[] }) {
  const points = days.filter((d) => d.entry?.mood)
  if (points.length === 0) return <ChartCard title="Umore"><EmptyChart /></ChartCard>

  return (
    <ChartCard title="Umore">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" aria-hidden="true">
        <line x1={PAD_X} y1={H / 2} x2={W - PAD_X} y2={H / 2} className="text-border" stroke="currentColor" strokeWidth="1" />
        {points.map((d, i) => {
          const index = days.indexOf(d)
          const cx = xAt(index, days.length)
          return (
            <circle
              key={d.date.toISOString()}
              cx={cx}
              cy={H / 2}
              r={i === points.length - 1 ? 4.5 : 3.5}
              className={moodTextColorClass(d.entry?.mood)}
              fill="currentColor"
            >
              <title>{`${dataBreve(d.date)} — ${d.entry?.mood}`}</title>
            </circle>
          )
        })}
      </svg>
    </ChartCard>
  )
}

/** Peso — linea, punti reali collegati in ordine cronologico (i pesi
 * mancanti restano semplicemente assenti dal tracciato, nessun valore
 * interpolato). */
export function WeightChart({ days }: { days: DayEntry[] }) {
  const points = days
    .map((d, i) => ({ i, date: d.date, weight: d.entry?.weight ?? null }))
    .filter((p): p is { i: number; date: Date; weight: number } => p.weight != null)
  if (points.length === 0) return <ChartCard title="Peso"><EmptyChart /></ChartCard>

  const values = points.map((p) => p.weight)
  const min = Math.min(...values)
  const max = Math.max(...values)
  // Un po' di margine sopra/sotto così il tracciato non tocca mai i bordi
  // — se il peso non varia (min === max) yAt gestisce già il caso a parte.
  const pad = Math.max((max - min) * 0.15, 0.5)
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xAt(p.i, days.length)} ${yAt(p.weight, min - pad, max + pad)}`)
    .join(" ")

  return (
    <ChartCard title="Peso">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" aria-hidden="true">
        <path d={path} className="text-primary" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p) => (
          <circle key={p.date.toISOString()} cx={xAt(p.i, days.length)} cy={yAt(p.weight, min - pad, max + pad)} r="2.25" className="text-primary" fill="currentColor">
            <title>{`${dataBreve(p.date)} — ${p.weight} kg`}</title>
          </circle>
        ))}
      </svg>
      <p className="text-ink-faint mt-1.5 text-[0.65rem]">
        {min === max ? `${min} kg` : `${min}–${max} kg nel periodo`}
      </p>
    </ChartCard>
  )
}

function BarChart({
  days,
  valueOf,
  unit,
  format,
}: {
  days: DayEntry[]
  valueOf: (entry: DiarioState) => number | null
  unit: string
  format: (value: number) => string
}) {
  const bars = days
    .map((d, i) => ({ i, date: d.date, value: d.entry ? valueOf(d.entry) : null }))
    .filter((b): b is { i: number; date: Date; value: number } => b.value != null && b.value > 0)
  if (bars.length === 0) return <EmptyChart />

  const max = Math.max(...bars.map((b) => b.value))
  const barW = Math.max(Math.min((W - 2 * PAD_X) / days.length - 2, 14), 3)

  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" aria-hidden="true">
        <line x1={PAD_X} y1={H - PAD_Y} x2={W - PAD_X} y2={H - PAD_Y} className="text-border" stroke="currentColor" strokeWidth="1" />
        {bars.map((b) => {
          const barH = ((H - 2 * PAD_Y) * b.value) / max
          const x = xAt(b.i, days.length) - barW / 2
          return (
            <rect
              key={b.date.toISOString()}
              x={x}
              y={H - PAD_Y - barH}
              width={barW}
              height={barH}
              rx={1.5}
              className="text-primary"
              fill="currentColor"
            >
              <title>{`${dataBreve(b.date)} — ${format(b.value)} ${unit}`}</title>
            </rect>
          )
        })}
      </svg>
    </>
  )
}

/** Sonno — barre, un giorno senza voce di sonno resta senza barra (non una
 * barra a zero: "nessun dato" e "zero ore" non sono la stessa cosa). */
export function SleepChart({ days }: { days: DayEntry[] }) {
  return (
    <ChartCard title="Sonno">
      <BarChart
        days={days}
        valueOf={(entry) => entry.sleepHours}
        unit="h"
        format={(v) => String(v)}
      />
    </ChartCard>
  )
}

/** Studio — minuti derivati da sessioni Pomodoro × durata di un blocco
 * (DURATIONS.focus, pomodoro-widget.tsx) — stessa fonte già usata nel
 * pannello destro, non un 25 ridigitato qui. */
export function StudyChart({ days }: { days: DayEntry[] }) {
  return (
    <ChartCard title="Studio">
      <BarChart
        days={days}
        valueOf={(entry) => (entry.pomodoroSessions > 0 ? Math.round(entry.pomodoroSessions * (DURATIONS.focus / 60)) : null)}
        unit="min"
        format={(v) => String(v)}
      />
    </ChartCard>
  )
}

/**
 * Abitudini — una riga per abitudine, un quadratino per giorno del
 * periodo: fatta (verde), non fatta ma il giorno ha una voce (vuoto), o
 * nessuna voce quel giorno (tenue, distinto apposta da "non fatta" — sono
 * due cose diverse, non conteggiarle insieme).
 *
 * `streaks` (Progress / Andamento v1, sez. Habits): serie attuale per
 * abitudine, SEMPRE su tutta la storia (computeHabitStreak,
 * lib/queries/diario.ts), non sul periodo in vista — stesso principio già
 * usato per la serie generale. Opzionale: `undefined` finché non è ancora
 * arrivata dal server (nessun "0g" lampeggiante mentre carica), omessa del
 * tutto quando è 0 — una serie a zero non è un'informazione, è rumore.
 */
export function HabitGrid({
  days,
  habitList,
  streaks,
}: {
  days: DayEntry[]
  habitList: readonly string[]
  streaks?: Record<string, DiarioStreaks>
}) {
  if (habitList.length === 0) return null
  return (
    <ChartCard title="Abitudini">
      <div className="flex flex-col gap-2.5">
        {habitList.map((habit) => {
          const withEntry = days.filter((d) => d.entry)
          const done = withEntry.filter((d) => d.entry?.habits[habit]).length
          const streak = streaks?.[habit]
          return (
            <div key={habit} className="flex items-center gap-2">
              <span className="w-20 shrink-0 truncate text-xs">{habit}</span>
              <div className="flex min-w-0 flex-1 flex-wrap gap-[3px]">
                {days.map((d) => {
                  const hasEntry = Boolean(d.entry)
                  const isDone = Boolean(d.entry?.habits[habit])
                  return (
                    <span
                      key={d.date.toISOString()}
                      title={`${dataBreve(d.date)} — ${!hasEntry ? "nessuna voce" : isDone ? habit : "non fatta"}`}
                      className={cn(
                        "size-2.5 shrink-0 rounded-[2px]",
                        !hasEntry ? "bg-muted" : isDone ? "bg-good" : "bg-border",
                      )}
                    />
                  )
                })}
              </div>
              {streak && streak.current > 0 && (
                <span
                  title={`Serie attuale: ${streak.current} ${streak.current === 1 ? "giorno" : "giorni"} di fila (record: ${streak.longest})`}
                  className="text-primary w-10 shrink-0 text-right font-mono text-[0.62rem] font-semibold tabular-nums"
                >
                  {streak.current}g
                </span>
              )}
              <span className="text-ink-faint w-14 shrink-0 text-right font-mono text-[0.62rem] tabular-nums">
                {withEntry.length > 0 ? `${done}/${withEntry.length}` : "—"}
              </span>
            </div>
          )
        })}
      </div>
    </ChartCard>
  )
}
