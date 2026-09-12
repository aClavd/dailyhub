import { dataEstesa, greeting } from "@/lib/datetime"

import { DailyQuote } from "./daily-quote"
import { HeaderFlankingRow } from "./header-flanking-row"
import { TodayFocus } from "./today-focus"

export function DashboardHeader({ firstName }: { firstName?: string }) {
  const now = new Date()

  return (
    <section className="py-8 text-center sm:py-10">
      <div className="mx-auto max-w-xs">
        <DailyQuote date={now} />
      </div>

      {/* Meteo/Spotify (fissi in testata) allineati agli stessi bordi della
          board qui sotto — la logica di larghezza vive in HeaderFlankingRow
          (client, per via di useBoard()), il saluto resta qui: niente
          bisogno di rendere client anche la data. */}
      <HeaderFlankingRow>
        <h1 className="font-heading text-3xl font-medium tracking-tight text-balance lowercase sm:text-4xl">
          {greeting(now)}
          {firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="mt-2.5 font-mono text-[0.7rem] tracking-[0.12em] text-ink-faint uppercase">
          {dataEstesa(now)}
        </p>
      </HeaderFlankingRow>

      <div className="mt-6">
        <TodayFocus />
      </div>
    </section>
  )
}
