import { Suspense } from "react"
import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { AgendaCard } from "@/components/dashboard/agenda-card"
import { AgendaSkeleton } from "@/components/dashboard/agenda-skeleton"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { MailPlaceholder } from "@/components/dashboard/mail-placeholder"
import { TopBar } from "@/components/dashboard/top-bar"
import { getTodayEvents } from "@/lib/google/calendar"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect("/")

  const firstName = session.user.name?.split(" ")[0]?.toLowerCase()

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 sm:px-6">
      <TopBar email={session.user.email} />
      <DashboardHeader firstName={firstName} />

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Suspense fallback={<AgendaSkeleton />}>
          <AgendaSection />
        </Suspense>
        <MailPlaceholder />
      </div>
    </div>
  )
}

async function AgendaSection() {
  const result = await getTodayEvents()
  return <AgendaCard result={result} />
}
