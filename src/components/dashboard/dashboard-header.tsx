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
    // visiva: py-6/sm:py-8 → py-5/sm:py-6. Visual Calibration v2:
    // py-5/sm:py-6 → py-4/sm:py-5 — stesso principio, un altro giro:
    // il saluto deve introdurre la giornata, non il board, che ora è
    // anche più grande (CELL_MAX_REM/ROW_HEIGHT_REM, lib/board.ts) e
    // merita di percepirsi ancora di più come il contenuto vero.
    <section className="py-4 text-center sm:py-5">
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
