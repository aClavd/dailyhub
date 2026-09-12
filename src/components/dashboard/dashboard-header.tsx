import { dataEstesa, greeting } from "@/lib/datetime"
import { MeteoWidget } from "@/components/widgets/meteo-widget"

import { DailyQuote } from "./daily-quote"
import { TodayFocus } from "./today-focus"

/** Stessa cornice della card "Frase del giorno", per stare bene affiancata al saluto. */
const SIDE_CARD = "w-40 shrink-0 rounded-xl border border-border bg-card px-4 py-3 text-left"

export function DashboardHeader({ firstName }: { firstName?: string }) {
  const now = new Date()

  return (
    <section className="py-8 text-center sm:py-10">
      <div className="mx-auto max-w-xs">
        <DailyQuote date={now} />
      </div>

      {/* Meteo a sinistra, saluto centrato, Spotify a destra — fissi qui,
          non blocchi della board: non hanno senso "spenti" a metà pagina,
          fanno parte della testata al pari della frase del giorno. La
          griglia a 3 colonne uguali (1fr) tiene il saluto perfettamente
          centrato qualunque sia la larghezza delle due card ai lati. Sotto
          sm: si impila, non c'è spazio per stare affiancati. */}
      <div className="mt-6 flex flex-col items-center gap-4 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-4">
        <div className={SIDE_CARD + " sm:justify-self-end"}>
          <p className="text-ink-faint text-[0.62rem] font-bold tracking-[0.14em] uppercase">
            Meteo
          </p>
          <div className="mt-1.5">
            <MeteoWidget />
          </div>
        </div>

        <div className="sm:justify-self-center">
          <h1 className="font-heading text-3xl font-medium tracking-tight text-balance lowercase sm:text-4xl">
            {greeting(now)}
            {firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="mt-2.5 font-mono text-[0.7rem] tracking-[0.12em] text-ink-faint uppercase">
            {dataEstesa(now)}
          </p>
        </div>

        {/* Presto qui: serve prima il collegamento OAuth con Spotify (vedi
            docs/SETUP-SPOTIFY.md) — segnaposto onesto, non un widget finto. */}
        <div className={SIDE_CARD + " sm:justify-self-start border-dashed"}>
          <p className="text-ink-faint text-[0.62rem] font-bold tracking-[0.14em] uppercase">
            Spotify
          </p>
          <p className="text-ink-faint mt-1.5 text-xs">Presto qui.</p>
        </div>
      </div>

      <div className="mt-6">
        <TodayFocus />
      </div>
    </section>
  )
}
