import { Suspense } from "react"
import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { Board } from "@/components/board/board"
import { BoardProvider } from "@/components/board/board-context"
import { Rail } from "@/components/board/rail"
import { AgendaBody } from "@/components/dashboard/agenda-card"
import { AgendaSkeletonBody } from "@/components/dashboard/agenda-skeleton"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { HistoryPanel } from "@/components/dashboard/history-panel"
import { MailBody } from "@/components/dashboard/mail-card"
import { MailSkeletonBody } from "@/components/dashboard/mail-skeleton"
import { TopBar } from "@/components/dashboard/top-bar"
import { DiarioWidget } from "@/components/widgets/diario-widget"
import { PomodoroWidget } from "@/components/widgets/pomodoro-widget"
import { chiaveGiorno } from "@/lib/datetime"
import { getBoardLayout } from "@/lib/queries/board"
import { getDiarioToday } from "@/lib/queries/diario"
import { getTodayEvents } from "@/lib/google/calendar"
import { getMail } from "@/lib/mail"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/")

  const firstName = session.user.name?.split(" ")[0]?.toLowerCase()

  // Board e diario vengono dal DB: si leggono prima di disegnare la pagina,
  // sono veloci (query indicizzate) e servono per lo stato iniziale.
  const [boardInitial, { state: diarioInitial, dayNumber }] = await Promise.all([
    getBoardLayout(),
    getDiarioToday(chiaveGiorno()),
  ])

  return (
    <BoardProvider initial={boardInitial}>
      <div className="flex flex-1">
        <Rail />
        <div className="min-w-0 flex-1 px-4 pb-16 sm:px-6 lg:px-10 xl:px-14">
          <TopBar email={session.user.email} />
          <DashboardHeader firstName={firstName} />

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
            diarioSlot={<DiarioWidget initial={diarioInitial} dayNumber={dayNumber} />}
            pomodoroSlot={<PomodoroWidget initial={diarioInitial.pomodoroSessions} />}
          />
        </div>
        <HistoryPanel />
      </div>
    </BoardProvider>
  )
}

async function AgendaSection() {
  const result = await getTodayEvents()
  return <AgendaBody result={result} />
}

async function MailSection() {
  const result = await getMail()
  return <MailBody result={result} />
}
