import { dataEstesa, greeting } from "@/lib/datetime"

import { DailyQuote } from "./daily-quote"
import { HeaderFlankingRow } from "./header-flanking-row"
import { TodayFocus } from "./today-focus"

export function DashboardHeader({
  firstName,
  spotifySlot,
}: {
  firstName?: string
  spotifySlot: React.ReactNode
}) {
  const now = new Date()

  return (
    // Fase 5.1: py ridotto (era py-8/sm:py-10) — meno distanza accumulata
    // tra "Oggi conta questo" e il primo widget della board qui sotto, il
    // resto del ritmo verticale interno (saluto/data/frase) resta com'era.
    <section className="py-6 text-center sm:py-8">
      <div className="mx-auto max-w-xs">
        <DailyQuote date={now} />
      </div>

      {/* Meteo/Spotify (fissi in testata) allineati agli stessi bordi della
          board qui sotto — la logica di larghezza vive in HeaderFlankingRow
          (client, per via di useBoard()), il saluto resta qui: niente
          bisogno di rendere client anche la data. */}
      <HeaderFlankingRow spotifySlot={spotifySlot}>
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
