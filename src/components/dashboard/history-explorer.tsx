"use client"

import { useEffect, useState, useTransition } from "react"

import { DialogClose, DialogPopup, DialogTitle } from "@/components/ui/dialog"
import { Segmented } from "@/components/widgets/_shared"
import { fetchDiarioEntry, fetchDiarioHistory, searchDiarioAction } from "@/lib/actions/history"
import {
  addDays,
  addMonths,
  chiaveGiorno,
  dataBreve,
  dataEstesa,
  meseAnno,
  monthGrid,
  parseChiave,
  weekDates,
} from "@/lib/datetime"
import { daySummary, moodDotClass, type DiarioState } from "@/lib/diario"
import type { DiarioSearchHit } from "@/lib/queries/diario"
import { cn } from "@/lib/utils"

type Mode = "Mese" | "Settimana"
const MODES: readonly Mode[] = ["Mese", "Settimana"]

const GIORNI_BREVI = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"]

/**
 * Cronologia estesa — mese/settimana, ricerca, riepilogo di un giorno.
 * Apribile dalla sezione Cronologia nel rail (rail.tsx), stesso
 * `<Dialog>` (Base UI). Mostra solo diario/abitudini/peso/sonno/
 * pomodoro: è tutto quello che il DB storicizza per giorno — niente
 * eventi di calendario (quelli sono nel blocco Calendario a parte, non
 * hanno una "cronologia": si legge sempre il calendario vero) né
 * Note/Lettura (contenuto continuo, non per-giorno), dichiarato
 * apposta, non nascosto.
 */
export function HistoryExplorer({ todayKey }: { todayKey: string }) {
  const [mode, setMode] = useState<Mode>("Mese")
  const [cursor, setCursor] = useState(() => parseChiave(todayKey))
  const [entries, setEntries] = useState<Record<string, DiarioState>>({})
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [searchResults, setSearchResults] = useState<DiarioSearchHit[] | null>(null)
  const [isPending, startTransition] = useTransition()

  // Rilegge le voci del mese/settimana in vista a ogni cambio — batch
  // unico via fetchDiarioHistory (già esistente, riusata).
  useEffect(() => {
    const dates = (mode === "Mese" ? monthGrid(cursor) : weekDates(cursor)).map(chiaveGiorno)
    startTransition(async () => {
      const result = await fetchDiarioHistory(dates)
      setEntries((prev) => ({ ...prev, ...result }))
    })
  }, [mode, cursor])

  // Se apri il dettaglio di un giorno fuori dal mese/settimana in vista
  // (es. da un risultato di ricerca), quel giorno non è ancora tra le
  // entries caricate — lo recupera da solo, una voce sola.
  useEffect(() => {
    if (!selectedDate || entries[selectedDate]) return
    startTransition(async () => {
      const entry = await fetchDiarioEntry(selectedDate)
      setEntries((prev) => ({ ...prev, [selectedDate]: entry }))
    })
  }, [selectedDate, entries])

  function runSearch() {
    const q = query.trim()
    if (!q) {
      setSearchResults(null)
      return
    }
    startTransition(async () => {
      setSearchResults(await searchDiarioAction(q))
    })
  }

  function goToday() {
    setCursor(parseChiave(todayKey))
    setSelectedDate(null)
    setSearchResults(null)
  }

  function goYesterday() {
    setSelectedDate(chiaveGiorno(addDays(parseChiave(todayKey), -1)))
    setSearchResults(null)
  }

  function goPrev() {
    setCursor((c) => (mode === "Mese" ? addMonths(c, -1) : addDays(c, -7)))
  }

  function goNext() {
    setCursor((c) => (mode === "Mese" ? addMonths(c, 1) : addDays(c, 7)))
  }

  const periodLabel = mode === "Mese" ? meseAnno(cursor) : `Settimana del ${dataBreve(weekDates(cursor)[0])}`

  return (
    <DialogPopup>
      <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3.5">
        <div>
          <DialogTitle>Cronologia</DialogTitle>
          <p className="text-ink-faint mt-0.5 text-[0.68rem]">
            Diario, abitudini, peso, sonno, pomodoro — non eventi o note
          </p>
        </div>
        <DialogClose
          aria-label="Chiudi"
          className="text-ink-faint hover:bg-muted hover:text-foreground grid size-7 shrink-0 place-items-center rounded-md text-base leading-none"
        >
          &times;
        </DialogClose>
      </div>

      <div className="flex shrink-0 items-center gap-2 border-b border-border px-5 py-3">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              runSearch()
            }
          }}
          placeholder="Cerca nel diario…"
          className="bg-muted border-border focus:outline-primary min-w-0 flex-1 rounded-md border px-2.5 py-1.5 text-sm focus:outline-2"
        />
        <button
          type="button"
          onClick={runSearch}
          className="border-border text-ink-soft hover:text-foreground shrink-0 rounded-md border px-3 py-1.5 text-xs font-medium"
        >
          Cerca
        </button>
        {searchResults && (
          <button
            type="button"
            onClick={() => {
              setQuery("")
              setSearchResults(null)
            }}
            aria-label="Annulla ricerca"
            className="text-ink-faint hover:text-foreground shrink-0 text-xs"
          >
            annulla
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {searchResults ? (
          <SearchResults hits={searchResults} onSelect={setSelectedDate} pending={isPending} />
        ) : selectedDate ? (
          <DayDetail
            date={selectedDate}
            entry={entries[selectedDate]}
            onBack={() => setSelectedDate(null)}
          />
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={goPrev}
                  aria-label="Periodo precedente"
                  className="border-border text-ink-soft hover:text-foreground grid size-6 place-items-center rounded-md border text-sm"
                >
                  ‹
                </button>
                <span className="w-36 text-center text-sm font-medium capitalize">{periodLabel}</span>
                <button
                  type="button"
                  onClick={goNext}
                  aria-label="Periodo successivo"
                  className="border-border text-ink-soft hover:text-foreground grid size-6 place-items-center rounded-md border text-sm"
                >
                  ›
                </button>
              </div>
              <Segmented label="Vista" options={MODES} value={mode} onChange={setMode} />
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={goToday}
                className="bg-brand-soft text-primary rounded-md px-2.5 py-1 text-xs font-semibold"
              >
                Oggi
              </button>
              <button
                type="button"
                onClick={goYesterday}
                className="border-border text-ink-soft hover:text-foreground rounded-md border px-2.5 py-1 text-xs"
              >
                Ieri
              </button>
              <input
                type="date"
                onChange={(event) => {
                  if (event.target.value) setSelectedDate(event.target.value)
                }}
                aria-label="Vai a una data specifica"
                className="border-border text-ink-soft rounded-md border px-2 py-1 text-xs"
              />
            </div>

            {mode === "Mese" ? (
              <MonthGrid cursor={cursor} entries={entries} todayKey={todayKey} onSelect={setSelectedDate} />
            ) : (
              <WeekList cursor={cursor} entries={entries} todayKey={todayKey} onSelect={setSelectedDate} />
            )}
          </>
        )}
      </div>
    </DialogPopup>
  )
}

function MonthGrid({
  cursor,
  entries,
  todayKey,
  onSelect,
}: {
  cursor: Date
  entries: Record<string, DiarioState>
  todayKey: string
  onSelect: (date: string) => void
}) {
  const days = monthGrid(cursor)
  const currentMonth = cursor.getMonth()

  return (
    <div>
      <div className="text-ink-faint mb-1 grid grid-cols-7 gap-1 text-center text-[0.62rem] uppercase">
        {GIORNI_BREVI.map((g) => (
          <div key={g}>{g}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const key = chiaveGiorno(d)
          const entry = entries[key]
          const inMonth = d.getMonth() === currentMonth
          const isToday = key === todayKey
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              className={cn(
                "hover:bg-muted flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-xs transition-colors",
                !inMonth && "text-ink-faint opacity-40",
                isToday && "bg-brand-soft text-primary font-semibold",
              )}
            >
              <span>{d.getDate()}</span>
              <span className={cn("size-1.5 rounded-full", entry ? moodDotClass(entry.mood) : "bg-transparent")} />
              <span className="text-ink-faint h-3 text-[0.55rem] tabular-nums">
                {entry && entry.pomodoroSessions > 0 ? `·${entry.pomodoroSessions}` : ""}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function WeekList({
  cursor,
  entries,
  todayKey,
  onSelect,
}: {
  cursor: Date
  entries: Record<string, DiarioState>
  todayKey: string
  onSelect: (date: string) => void
}) {
  const days = weekDates(cursor)
  return (
    <div className="divide-border divide-y">
      {days.map((d) => {
        const key = chiaveGiorno(d)
        const entry = entries[key]
        const summary = daySummary(entry)
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            className="hover:bg-muted flex w-full items-center gap-3 rounded-md px-1.5 py-2.5 text-left"
          >
            <span className={cn("size-1.5 shrink-0 rounded-full", moodDotClass(entry?.mood))} />
            <span className="text-ink-soft w-14 shrink-0 font-mono text-[0.68rem] uppercase">
              {dataBreve(d)}
            </span>
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-xs",
                summary ? "text-ink-soft" : "text-ink-faint italic",
              )}
            >
              {summary || "Nessuna voce"}
            </span>
            {key === todayKey && (
              <span className="text-primary shrink-0 text-[0.6rem] font-semibold uppercase">oggi</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

function SearchResults({
  hits,
  pending,
  onSelect,
}: {
  hits: DiarioSearchHit[]
  pending: boolean
  onSelect: (date: string) => void
}) {
  if (pending) return <p className="text-ink-faint py-8 text-center text-sm">Cerco…</p>
  if (hits.length === 0) {
    return <p className="text-ink-faint py-8 text-center text-sm">Nessuna voce trovata.</p>
  }
  return (
    <div className="divide-border divide-y">
      {hits.map((hit) => (
        <button
          key={hit.date}
          type="button"
          onClick={() => onSelect(hit.date)}
          className="hover:bg-muted block w-full rounded-md px-1.5 py-2.5 text-left"
        >
          <span className="text-ink-soft font-mono text-[0.68rem] uppercase">
            {dataBreve(parseChiave(hit.date))}
          </span>
          <p className="mt-0.5 truncate text-xs">{hit.snippet}</p>
        </button>
      ))}
    </div>
  )
}

function DayDetail({
  date,
  entry,
  onBack,
}: {
  date: string
  entry?: DiarioState
  onBack: () => void
}) {
  return (
    <div>
      <button type="button" onClick={onBack} className="text-ink-soft hover:text-foreground mb-3 text-xs">
        ‹ Torna al calendario
      </button>
      <p className="font-heading text-base capitalize">{dataEstesa(parseChiave(date))}</p>

      {!entry ? (
        <p className="text-ink-faint mt-6 text-center text-sm">Carico…</p>
      ) : isEntryEmpty(entry) ? (
        <p className="text-ink-faint mt-6 text-center text-sm italic">Nessuna voce per questo giorno.</p>
      ) : (
        <div className="mt-3 space-y-3">
          {entry.mood && (
            <div className="flex items-center gap-2 text-sm">
              <span className={cn("size-1.5 rounded-full", moodDotClass(entry.mood))} />
              {entry.mood}
            </div>
          )}
          {entry.obiettivo && (
            <div>
              <p className="text-ink-faint text-[0.65rem] uppercase">Obiettivo</p>
              <p className="mt-0.5 text-sm">{entry.obiettivo}</p>
            </div>
          )}
          {entry.testo && (
            <div>
              <p className="text-ink-faint text-[0.65rem] uppercase">Diario</p>
              <p className="mt-0.5 text-sm whitespace-pre-wrap">{entry.testo}</p>
            </div>
          )}
          {Object.keys(entry.habits).length > 0 && (
            <div>
              <p className="text-ink-faint text-[0.65rem] uppercase">Abitudini</p>
              <ul className="mt-1 space-y-1">
                {Object.entries(entry.habits).map(([name, done]) => (
                  <li key={name} className="flex items-center gap-2 text-sm">
                    <span className={cn("size-1.5 rounded-full", done ? "bg-good" : "bg-border")} />
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {(entry.weight != null || entry.sleepHours != null || entry.pomodoroSessions > 0) && (
            <div className="text-ink-soft flex flex-wrap gap-x-4 gap-y-1 text-xs">
              {entry.weight != null && <span>{entry.weight} kg</span>}
              {entry.sleepHours != null && <span>{entry.sleepHours} h di sonno</span>}
              {entry.pomodoroSessions > 0 && (
                <span>
                  {entry.pomodoroSessions} {entry.pomodoroSessions === 1 ? "pomodoro" : "pomodori"}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function isEntryEmpty(entry: DiarioState): boolean {
  return (
    !entry.mood &&
    !entry.obiettivo &&
    !entry.testo &&
    Object.keys(entry.habits).length === 0 &&
    entry.weight == null &&
    entry.sleepHours == null &&
    entry.pomodoroSessions === 0
  )
}
