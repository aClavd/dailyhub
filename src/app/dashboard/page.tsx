import { Suspense } from "react"
import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { Board } from "@/components/board/board"
import { BoardProvider } from "@/components/board/board-context"
import { Rail, type HistoryDayData } from "@/components/board/rail"
import { AgendaLive } from "@/components/dashboard/agenda-card"
import { AgendaSkeletonBody } from "@/components/dashboard/agenda-skeleton"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DiarioReminder } from "@/components/dashboard/diario-reminder"
import { MailLive } from "@/components/dashboard/mail-card"
import { MailSkeletonBody } from "@/components/dashboard/mail-skeleton"
import { MorningBriefingGate } from "@/components/dashboard/morning-briefing"
import { RightPanel } from "@/components/dashboard/right-panel"
import { SpotifyBody, SpotifySkeletonBody } from "@/components/dashboard/spotify-card"
import { ToastProvider } from "@/components/dashboard/toast-context"
import { TopBar } from "@/components/dashboard/top-bar"
import { DiarioWidget } from "@/components/widgets/diario-widget"
import { PomodoroWidget } from "@/components/widgets/pomodoro-widget"
import { chiaveGiorno, dataBreve } from "@/lib/datetime"
import { isLiberoConfigured } from "@/lib/libero-mail"
import { getActiveBoardLayout } from "@/lib/queries/board"
import { getDiarioHistory, getDiarioToday } from "@/lib/queries/diario"
import { getTodayEvents } from "@/lib/google/calendar"
import { getMail } from "@/lib/mail"
import { listMailFilters } from "@/lib/queries/mail-filters"
import { getSpotifyStatus } from "@/lib/queries/spotify"

const HISTORY_DAYS = 7

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

/** Ultimi 7 giorni per la sezione Cronologia del rail — prima letti da un
 * Server Component a parte (history-panel.tsx, eliminato: la Cronologia
 * ora vive dentro Rail, non più in una colonna a sé sulla destra). Dati
 * già "piatti" per il client, niente Date da ricostruire lì. */
async function getHistoryDays(): Promise<{ days: HistoryDayData[]; todayKey: string }> {
  const dates = Array.from({ length: HISTORY_DAYS }, (_, i) => daysAgo(i))
  const keys = dates.map((d) => chiaveGiorno(d))
  const history = await getDiarioHistory(keys)
  const today = chiaveGiorno()

  const days: HistoryDayData[] = dates.map((date, i) => ({
    key: keys[i],
    label: dataBreve(date),
    dayNumber: date.getDate(),
    isToday: keys[i] === today,
    entry: history[keys[i]],
  }))

  return { days, todayKey: today }
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/")

  const firstName = session.user.name?.split(" ")[0]?.toLowerCase()

  // Board, diario, cronologia, impegni, mail e filtri: si leggono tutti
  // prima di disegnare la pagina, in parallelo. Impegni/mail servono sia ai
  // rispettivi widget (AgendaSection/MailSection sotto, via Suspense) sia
  // al pannello destro (RightPanel, Daily Brief) — getTodayEvents/getMail
  // sono avvolte in cache() (lib/google/calendar.ts, lib/mail.ts) apposta:
  // letture identiche nella stessa richiesta si deduplicano da sole, non
  // raddoppiano le chiamate reali a Google Calendar/Gmail.
  const [
    boardInitial,
    { state: diarioInitial, dayNumber },
    { days: historyDays, todayKey },
    eventsInitial,
    mailInitial,
    mailFilters,
    spotifyStatus,
  ] = await Promise.all([
    getActiveBoardLayout(),
    getDiarioToday(chiaveGiorno()),
    getHistoryDays(),
    getTodayEvents(),
    getMail(),
    listMailFilters(),
    // Serve sia a SpotifySection sotto (Suspense) sia alla scheda Account
    // del dialog Impostazioni — getSpotifyStatus è avvolta in cache()
    // (lib/queries/spotify.ts) apposta: due letture identiche nella stessa
    // richiesta si deduplicano da sole, non raddoppiano la vera chiamata a
    // Spotify.
    getSpotifyStatus(),
  ])

  return (
    <ToastProvider>
      <BoardProvider initial={boardInitial}>
        <MorningBriefingGate
          events={eventsInitial}
          mail={mailInitial}
          filters={mailFilters}
          diarioInitial={diarioInitial}
          todayKey={todayKey}
          firstName={firstName}
        >
          <div className="flex flex-1">
            <Rail historyDays={historyDays} todayKey={todayKey} />
            <div className="min-w-0 flex-1 px-4 pb-16 sm:px-6 lg:px-10 xl:px-14">
              <TopBar
                todayKey={todayKey}
                googleError={session.error}
                spotifyStatus={spotifyStatus}
                liberoConfigured={isLiberoConfigured()}
                userEmail={session.user.email}
              />
              <DashboardHeader
                firstName={firstName}
                spotifySlot={
                  <Suspense fallback={<SpotifySkeletonBody />}>
                    <SpotifySection />
                  </Suspense>
                }
              />

              <Board
                agendaSlot={
                  <Suspense fallback={<AgendaSkeletonBody />}>
                    <AgendaSection />
                  </Suspense>
                }
                mailSlot={
                  <Suspense fallback={<MailSkeletonBody />}>
                    <MailSection />
                  </Suspense>
                }
                diarioSlot={<DiarioWidget initial={diarioInitial} dayNumber={dayNumber} todayKey={todayKey} />}
                pomodoroSlot={<PomodoroWidget initial={diarioInitial.pomodoroSessions} />}
              />
              <DiarioReminder
                hasWrittenToday={Boolean(diarioInitial.testo.trim())}
                todayKey={todayKey}
              />
            </div>
            <RightPanel
              initialEvents={eventsInitial}
              initialMail={mailInitial}
              filters={mailFilters}
              diarioInitial={diarioInitial}
              todayKey={todayKey}
              googleError={session.error}
              spotifyStatus={spotifyStatus}
              liberoConfigured={isLiberoConfigured()}
              userEmail={session.user.email}
            />
          </div>
        </MorningBriefingGate>
      </BoardProvider>
    </ToastProvider>
  )
}

async function AgendaSection() {
  const result = await getTodayEvents()
  return <AgendaLive initial={result} todayKey={chiaveGiorno()} />
}

async function MailSection() {
  const [result, filters] = await Promise.all([getMail(), listMailFilters()])
  return <MailLive initial={result} initialFilters={filters} />
}

async function SpotifySection() {
  const status = await getSpotifyStatus()
  return <SpotifyBody status={status} />
}
