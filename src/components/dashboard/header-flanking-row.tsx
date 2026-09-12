"use client"

import type { ReactNode } from "react"

import { useBoard } from "@/components/board/board-context"
import { MeteoWidget } from "@/components/widgets/meteo-widget"
import { boardNaturalWidthRem } from "@/lib/board"

/** Stessa cornice della card "Frase del giorno", per stare bene affiancata al saluto. */
const SIDE_CARD = "w-40 shrink-0 rounded-xl border border-border bg-card px-4 py-3 text-left"

/**
 * Meteo a sinistra, saluto (children) centrato, Spotify a destra — allineati
 * agli stessi bordi della board qui sotto, non ai bordi della finestra:
 * larghezza calcolata con la stessa formula di board.tsx
 * (boardNaturalWidthRem), sugli stessi dati di useBoard() — nessuna misura
 * via JS, i due combaciano sempre perché partono dallo stesso numero.
 * Componente a parte (non dentro dashboard-header.tsx) solo per poter usare
 * useBoard() qui, senza rendere client anche la data/il saluto sopra.
 */
export function HeaderFlankingRow({ children }: { children: ReactNode }) {
  const { layout } = useBoard()
  const naturalWidth = `${boardNaturalWidthRem(layout)}rem`

  return (
    <div className="mx-auto mt-6" style={{ width: `min(100%, ${naturalWidth})` }}>
      <div className="flex flex-col items-center gap-4 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-4">
        <div className={SIDE_CARD + " sm:justify-self-start"}>
          <p className="text-ink-faint text-[0.62rem] font-bold tracking-[0.14em] uppercase">
            Meteo
          </p>
          <div className="mt-1.5">
            <MeteoWidget />
          </div>
        </div>

        <div className="sm:justify-self-center">{children}</div>

        {/* Presto qui: serve prima il collegamento OAuth con Spotify (vedi
            docs/SETUP-SPOTIFY.md) — segnaposto onesto, non un widget finto. */}
        <div className={SIDE_CARD + " sm:justify-self-end border-dashed"}>
          <p className="text-ink-faint text-[0.62rem] font-bold tracking-[0.14em] uppercase">
            Spotify
          </p>
          <p className="text-ink-faint mt-1.5 text-xs">Presto qui.</p>
        </div>
      </div>
    </div>
  )
}
