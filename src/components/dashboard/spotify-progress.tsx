"use client"

import { useEffect, useState } from "react"

function formatTime(ms: number): string {
  const totalSec = Math.max(0, Math.round(ms / 1000))
  const minutes = Math.floor(totalSec / 60)
  const seconds = totalSec % 60
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

/**
 * Barra della traccia in ascolto. Niente polling: la posizione arriva una
 * volta (al caricamento o dopo un comando) e da lì si anima da sola verso
 * il 100% con una transizione CSS della durata pari al tempo rimasto —
 * sembra viva in tempo reale senza dover reinterrogare Spotify ogni
 * secondo. Va montata con `key` legata alla traccia/posizione (vedi
 * spotify-card.tsx): un remount, non un effect con setState sincrono, è
 * il modo pulito per "resettare" l'animazione quando arriva un dato nuovo.
 */
export function SpotifyProgress({
  progressMs,
  durationMs,
  isPlaying,
}: {
  progressMs: number
  durationMs: number
  isPlaying: boolean
}) {
  const startPct = durationMs > 0 ? Math.min(100, (progressMs / durationMs) * 100) : 0
  const [pct, setPct] = useState(startPct)
  const remainingMs = Math.max(0, durationMs - progressMs)

  useEffect(() => {
    if (!isPlaying || remainingMs <= 0) return
    // Un frame dopo il mount, cambiare il target width fa scattare la
    // transizione CSS: deve succedere DOPO il primo paint al valore
    // iniziale, altrimenti il browser non anima nulla (parte già a 100%).
    const id = requestAnimationFrame(() => setPct(100))
    return () => cancelAnimationFrame(id)
  }, [isPlaying, remainingMs])

  return (
    <div className="mt-2.5">
      <div className="bg-muted h-1 w-full overflow-hidden rounded-full">
        <div
          className="bg-primary h-full rounded-full"
          style={{
            width: `${pct}%`,
            transition: isPlaying ? `width ${remainingMs}ms linear` : undefined,
          }}
        />
      </div>
      <div className="text-ink-faint mt-1 flex justify-between text-[0.6rem] tabular-nums">
        <span>{formatTime(progressMs)}</span>
        <span>{formatTime(durationMs)}</span>
      </div>
    </div>
  )
}
