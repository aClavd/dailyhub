"use client"

import type { ReactNode } from "react"

import { useBoard } from "@/components/board/board-context"
import { MeteoWidget } from "@/components/widgets/meteo-widget"
import { boardDisplayWidthRem } from "@/lib/board"

/** Stessa cornice della card "Frase del giorno", per stare bene affiancata al saluto. */
const SIDE_CARD = "w-40 shrink-0 rounded-xl border border-border bg-card px-4 py-3 text-left"

/**
 * Meteo a sinistra, saluto (children) centrato, Spotify a destra — allineati
 * agli stessi bordi della board qui sotto, non ai bordi della finestra:
 * larghezza calcolata con la stessa formula di board.tsx
 * (boardDisplayWidthRem, col minimo di 3 colonne per non schiacciarsi con
 * pochi blocchi — vedi il commento lì), sugli stessi dati di useBoard() —
 * nessuna misura via JS, i due restano sempre allineati, anche quando
 * entra in gioco il minimo (prima usavano formule diverse: board.tsx aveva
 * già il minimo, qui c'era solo un fit-content "di emergenza" — risultato,
 * con un solo blocco sulla board Meteo/saluto/Spotify restavano schiacciati
 * l'uno sull'altro invece di restare ariosi come col resto della board).
 * Componente a parte (non dentro dashboard-header.tsx) solo per poter usare
 * useBoard() qui, senza rendere client anche la data/il saluto sopra.
 *
 * minWidth: fit-content resta come ultima rete di sicurezza — per un
 * saluto/nome insolitamente lungo che superasse pure il minimo di 3
 * colonne, non deve mai tagliarsi. Nel caso normale non ha effetto.
 */
export function HeaderFlankingRow({
  children,
  spotifySlot,
}: {
  children: ReactNode
  /** Server-rendered (dati Spotify), passato da dashboard-header.tsx/page.tsx. */
  spotifySlot: ReactNode
}) {
  const { layout } = useBoard()
  const displayWidth = `${boardDisplayWidthRem(layout)}rem`

  return (
    <div
      // mt-5 → mt-4 (Visual Calibration v2) — stesso ritmo ridotto di
      // dashboard-header.tsx (py-5→py-4).
      className="mx-auto mt-4"
      style={{ width: `min(100%, ${displayWidth})`, minWidth: "fit-content" }}
    >
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

        <div className={SIDE_CARD + " sm:justify-self-end"}>
          <p className="text-ink-faint text-[0.62rem] font-bold tracking-[0.14em] uppercase">
            Spotify
          </p>
          <div className="mt-1.5">{spotifySlot}</div>
        </div>
      </div>
    </div>
  )
}
