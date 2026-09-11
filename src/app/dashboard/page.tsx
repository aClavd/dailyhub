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
import { MailBody } from "@/components/dashboard/mail-placeholder"
import { TopBar } from "@/components/dashboard/top-bar"
import { getTodayEvents } from "@/lib/google/calendar"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect("/")

  const firstName = session.user.name?.split(" ")[0]?.toLowerCase()

  return (
    <BoardProvider>
      <div className="flex flex-1">
        <Rail />
        <div className="min-w-0 flex-1 px-4 pb-16 sm:px-6 lg:px-10 xl:px-14">
          <TopBar email={session.user.email} />
          <DashboardHeader firstName={firstName} />

          <div className="flex flex-col items-start gap-5 xl:flex-row">
            <div className="min-w-0 flex-1 self-stretch">
              <Board
                agendaSlot={
                  <Suspense fallback={<AgendaSkeletonBody />}>
                    <AgendaSection />
                  </Suspense>
                }
                mailSlot={<MailBody />}
              />
            </div>
            <HistoryPanel />
          </div>
        </div>
      </div>
    </BoardProvider>
  )
}

async function AgendaSection() {
  const result = await getTodayEvents()
  return <AgendaBody result={result} />
}
