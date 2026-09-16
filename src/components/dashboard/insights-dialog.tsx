"use client"

import type { ReactNode } from "react"
import { useEffect, useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { DialogClose, DialogPopup, DialogTitle } from "@/components/ui/dialog"
import { Segmented } from "@/components/widgets/_shared"
import { DURATIONS } from "@/components/widgets/pomodoro-widget"
import { reconnectGoogle } from "@/lib/actions/auth"
import { fetchDiarioRange, fetchDiarioStreaks } from "@/lib/actions/history"
import { disconnectSpotify } from "@/lib/actions/spotify"
import {
  addDays,
  addMonths,
  addYears,
  chiaveGiorno,
  dataBreve,
  dataEstesa,
  meseAnno,
  monthDates,
  parseChiave,
  weekDates,
  yearDates,
} from "@/lib/datetime"
import { isDiarioEntryEmpty, type DiarioState } from "@/lib/diario"
import type { DiarioStreaks } from "@/lib/queries/diario"
import type { SpotifyStatus } from "@/lib/queries/spotify"
import { cn } from "@/lib/utils"

import { HabitGrid, MoodChart, SleepChart, StudyChart, WeightChart } from "./insights-charts"

type Tab = "Andamento" | "Account"
const TABS: readonly Tab[] = ["Andamento", "Account"]

type Period = "Giorno" | "Settimana" | "Mese" | "Anno"
const PERIODS: readonly Period[] = ["Giorno", "Settimana", "Mese", "Anno"]

const PERIOD_DATES: Record<Period, (cursor: Date) => Date[]> = {
  Giorno: (c) => [c],
  Settimana: weekDates,
  Mese: monthDates,
  Anno: yearDates,
}

const PERIOD_LABEL: Record<Period, (cursor: Date) => string> = {
  Giorno: (c) => dataEstesa(c),
  Settimana: (c) => `Settimana del ${dataBreve(weekDates(c)[0])}`,
  Mese: (c) => meseAnno(c),
  Anno: (c) => String(c.getFullYear()),
}

const PERIOD_SHIFT: Record<Period, (cursor: Date, dir: 1 | -1) => Date> = {
  Giorno: (c, dir) => addDays(c, dir),
  Settimana: (c, dir) => addDays(c, dir * 7),
  Mese: (c, dir) => addMonths(c, dir),
  Anno: (c, dir) => addYears(c, dir),
}

/** 0-6: quanti gruppi di campi del diario sono compilati quel giorno —
 * testo, obiettivo, umore, abitudini (almeno una), pomodoro, peso/sonno
 * (raggruppati). Stesso proxy onesto di "giorno attivo" già usato altrove
 * (isDiarioEntryEmpty) ma con più sfumature, per la griglia colorata. */
function activityScore(entry?: DiarioState): number {
  if (!entry) return 0
  let score = 0
  if (entry.testo.trim()) score += 1
  if (entry.obiettivo.trim()) score += 1
  if (entry.mood) score += 1
  if (Object.values(entry.habits).some(Boolean)) score += 1
  if (entry.pomodoroSessions > 0) score += 1
  if (entry.weight != null || entry.sleepHours != null) score += 1
  return score
}

const ACTIVITY_LEVEL_CLASS = [
  "bg-border",
  "bg-primary/15",
  "bg-primary/30",
  "bg-primary/45",
  "bg-primary/60",
  "bg-primary/80",
  "bg-primary",
]

/** Raggruppa un elenco di giorni consecutivi in colonne-settimana
 * (lunedì→domenica), imbottite di `null` dove il periodo non copre tutta
 * la settimana — stesso linguaggio visivo di una griglia di contributi
 * (colonne = settimane, righe = giorni), qualunque sia il periodo scelto. */
function buildWeeksGrid(dates: Date[]): (Date | null)[][] {
  if (dates.length === 0) return []
  const weeks: (Date | null)[][] = []
  let week: (Date | null)[] = []
  const firstWeekday = (dates[0].getDay() || 7) - 1 // 0=lun..6=dom
  for (let i = 0; i < firstWeekday; i++) week.push(null)
  for (const d of dates) {
    week.push(d)
    if (week.length === 7) {
      weeks.push(week)
      week = []
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null)
    weeks.push(week)
  }
  return weeks
}

/**
 * Impostazioni — account connessi (Google/Spotify/Libero) + Andamento
 * (statistiche, griglia "giorni con attività" in stile calendario dei
 * contributi, grafici veri su umore/peso/sonno/studio/abitudini). Apribile
 * da un'icona in testata al pannello destro (right-panel.tsx), stesso
 * `<Dialog>` (Base UI) di HistoryExplorer/LayoutManager.
 *
 * Dati pochi finché il progetto è giovane — dichiarato apposta (Claudio lo
 * sa già): ogni riquadro/grafico ha un suo stato vuoto onesto, mai un dato
 * inventato o interpolato per riempire lo spazio.
 */
export function InsightsDialog({
  todayKey,
  habitList,
  googleError,
  spotifyStatus,
  liberoConfigured,
}: {
  todayKey: string
  habitList: readonly string[]
  googleError?: string
  spotifyStatus: SpotifyStatus
  liberoConfigured: boolean
}) {
  const [tab, setTab] = useState<Tab>("Andamento")
  const [period, setPeriod] = useState<Period>("Settimana")
  const [cursor, setCursor] = useState(() => parseChiave(todayKey))
  const [entries, setEntries] = useState<Record<string, DiarioState>>({})
  const [streaks, setStreaks] = useState<DiarioStreaks | null>(null)
  const [isPending, startTransition] = useTransition()

  // Rilegge le voci del periodo in vista a ogni cambio di periodo/cursore
  // — batch unico via fetchDiarioRange, stesso schema di
  // fetchDiarioHistory in history-explorer.tsx. `dates` ricalcolato qui
  // dentro (non preso dalla variabile usata per il render sotto): l'effect
  // dipende solo da period/cursor, non da un array ricreato a ogni render.
  useEffect(() => {
    const periodDays = PERIOD_DATES[period](cursor)
    const start = chiaveGiorno(periodDays[0])
    const end = chiaveGiorno(periodDays[periodDays.length - 1])
    startTransition(async () => {
      const result = await fetchDiarioRange(start, end)
      setEntries((prev) => ({ ...prev, ...result }))
    })
  }, [period, cursor])

  // Serie (streak): sempre su tutta la storia, non solo il periodo in
  // vista — una sola lettura, alla prima apertura della scheda Andamento.
  useEffect(() => {
    if (tab !== "Andamento" || streaks) return
    startTransition(async () => {
      setStreaks(await fetchDiarioStreaks())
    })
  }, [tab, streaks])

  const dates = PERIOD_DATES[period](cursor)
  const days = dates.map((date) => ({ date, entry: entries[chiaveGiorno(date)] }))
  const activeDays = days.filter((d) => d.entry && !isDiarioEntryEmpty(d.entry)).length
  const totalPomodori = days.reduce((sum, d) => sum + (d.entry?.pomodoroSessions ?? 0), 0)
  const totalMinuti = Math.round(totalPomodori * (DURATIONS.focus / 60))
  const weeks = buildWeeksGrid(dates)

  return (
    <DialogPopup className="max-w-3xl">
      <div className="border-border flex shrink-0 items-center justify-between border-b px-5 py-3.5">
        <div>
          <DialogTitle>Impostazioni</DialogTitle>
          <p className="text-ink-faint mt-0.5 text-[0.68rem]">Account connessi e andamento nel tempo</p>
        </div>
        <DialogClose
          aria-label="Chiudi"
          className="text-ink-faint hover:bg-muted hover:text-foreground grid size-7 shrink-0 place-items-center rounded-md text-base leading-none"
        >
          &times;
        </DialogClose>
      </div>

      <div className="border-border shrink-0 border-b px-5 py-3">
        <Segmented label="Sezione" options={TABS} value={tab} onChange={setTab} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {tab === "Account" ? (
          <AccountTab googleError={googleError} spotifyStatus={spotifyStatus} liberoConfigured={liberoConfigured} />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCursor((c) => PERIOD_SHIFT[period](c, -1))}
                  aria-label="Periodo precedente"
                  className="border-border text-ink-soft hover:text-foreground grid size-6 place-items-center rounded-md border text-sm"
                >
                  ‹
                </button>
                <span className="w-40 text-center text-sm font-medium capitalize">
                  {PERIOD_LABEL[period](cursor)}
                </span>
                <button
                  type="button"
                  onClick={() => setCursor((c) => PERIOD_SHIFT[period](c, 1))}
                  aria-label="Periodo successivo"
                  className="border-border text-ink-soft hover:text-foreground grid size-6 place-items-center rounded-md border text-sm"
                >
                  ›
                </button>
              </div>
              <Segmented
                label="Periodo"
                options={PERIODS}
                value={period}
                onChange={(p) => {
                  setPeriod(p)
                  setCursor(parseChiave(todayKey))
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <StatTile label="Giorni con attività" value={String(activeDays)} />
              <StatTile label="Serie attuale" value={streaks ? `${streaks.current} g` : "…"} />
              <StatTile label="Serie più lunga" value={streaks ? `${streaks.longest} g` : "…"} />
              <StatTile label="Studio" value={`${totalPomodori} pom. · ${totalMinuti} min`} />
            </div>

            <div>
              <p className="text-ink-faint text-[0.62rem] font-semibold tracking-[0.08em] uppercase">
                Giorni con attività
              </p>
              <div className="mt-2 overflow-x-auto pb-1">
                <div className="flex w-max gap-[3px]">
                  {weeks.map((week, wi) => (
                    <div key={wi} className="flex flex-col gap-[3px]">
                      {week.map((d, di) => {
                        if (!d) return <span key={di} className="size-[11px]" />
                        const level = activityScore(entries[chiaveGiorno(d)])
                        return (
                          <span
                            key={di}
                            title={`${dataBreve(d)} — ${level === 0 ? "nessuna attività" : `${level}/6`}`}
                            className={cn("size-[11px] rounded-[2px]", ACTIVITY_LEVEL_CLASS[level])}
                          />
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {isPending && Object.keys(entries).length === 0 && (
              <p className="text-ink-faint text-center text-xs">Carico…</p>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <MoodChart days={days} />
              <WeightChart days={days} />
              <SleepChart days={days} />
              <StudyChart days={days} />
            </div>

            <HabitGrid days={days} habitList={habitList} />
          </div>
        )}
      </div>
    </DialogPopup>
  )
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-border rounded-lg border p-2.5">
      <p className="text-ink-faint text-[0.62rem] font-semibold tracking-[0.08em] uppercase">{label}</p>
      <p className="font-heading mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  )
}

function AccountTab({
  googleError,
  spotifyStatus,
  liberoConfigured,
}: {
  googleError?: string
  spotifyStatus: SpotifyStatus
  liberoConfigured: boolean
}) {
  const spotifyError = spotifyStatus.connected && "error" in spotifyStatus
  return (
    <div className="flex flex-col gap-2.5">
      <AccountRow
        title="Google"
        detail="Calendario e Gmail"
        status={googleError ? "Sessione scaduta" : "Connesso"}
        ok={!googleError}
        action={
          googleError ? (
            <form action={reconnectGoogle}>
              <Button type="submit" variant="outline" size="sm">
                Riconnetti
              </Button>
            </form>
          ) : null
        }
      />
      <AccountRow
        title="Spotify"
        detail="Brano in ascolto e comandi di riproduzione"
        status={!spotifyStatus.connected ? "Non collegato" : spotifyError ? "Sessione scaduta" : "Connesso"}
        ok={spotifyStatus.connected && !spotifyError}
        action={
          !spotifyStatus.connected || spotifyError ? (
            <a href="/api/spotify/connect" className="text-primary text-xs font-medium hover:underline">
              {spotifyError ? "Riconnetti" : "Connetti"}
            </a>
          ) : (
            <form action={disconnectSpotify}>
              <Button type="submit" variant="outline" size="sm">
                Scollega
              </Button>
            </form>
          )
        }
      />
      <AccountRow
        title="Libero Mail"
        detail="Posta in arrivo via IMAP"
        status={liberoConfigured ? "Configurato" : "Non configurato"}
        ok={liberoConfigured}
        action={null}
      />
      <p className="text-ink-faint text-[0.65rem]">
        Libero non è un account per-utente: si configura via variabili d&apos;ambiente sul server, nessuna
        azione possibile da qui.
      </p>
    </div>
  )
}

function AccountRow({
  title,
  detail,
  status,
  ok,
  action,
}: {
  title: string
  detail: string
  status: string
  ok: boolean
  action: ReactNode
}) {
  return (
    <div className="border-border flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-ink-faint truncate text-[0.68rem]">{detail}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        <span className={cn("flex items-center gap-1.5 text-xs font-medium", ok ? "text-good" : "text-ink-faint")}>
          <span className={cn("size-1.5 rounded-full", ok ? "bg-good" : "bg-border")} />
          {status}
        </span>
        {action}
      </div>
    </div>
  )
}
