import { dataEstesa, greeting } from "@/lib/datetime"

import { DailyQuote } from "./daily-quote"
import { HeaderFlankingRow } from "./header-flanking-row"

export function DashboardHeader({
  firstName,
  spotifySlot,
}: {
  firstName?: string
  spotifySlot: React.ReactNode
}) {
  const now = new Date()

  return (
    // Fase 5.1: py ridotto (era py-8/sm:py-10). Pass di calibrazione
    // visiva: ridotto di nuovo (py-6/sm:py-8 → py-5/sm:py-6) — il saluto
    // deve introdurre la giornata, non dominarla («Workspace > Greeting»),
    // una riduzione leggera, non drastica: resta comunque uno spazio suo.
    <section className="py-5 text-center sm:py-6">
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
    </section>
  )
}
