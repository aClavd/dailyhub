"use client"

import { Pause, Play, SkipBack, SkipForward } from "lucide-react"
import { useState, useTransition } from "react"

import {
  disconnectSpotify,
  nextSpotifyTrack,
  pauseSpotifyPlayback,
  previousSpotifyTrack,
  resumeSpotifyPlayback,
} from "@/lib/actions/spotify"
import type { SpotifyStatus } from "@/lib/queries/spotify"

import { SpotifyControlButton } from "./spotify-controls"
import { SpotifyProgress } from "./spotify-progress"

/**
 * Contenuto della card Spotify in testata (la cornice la mette
 * header-flanking-row.tsx). Client component: i comandi di riproduzione
 * aggiornano lo stato con il valore che torna direttamente dalla Server
 * Action, non affidandosi al refresh automatico di Next della pagina —
 * vedi il commento su runPlayerCommand in lib/actions/spotify.ts per il
 * perché.
 */
export function SpotifyBody({ status: initialStatus }: { status: SpotifyStatus }) {
  const [status, setStatus] = useState(initialStatus)
  const [isPending, startTransition] = useTransition()

  function runCommand(action: () => Promise<SpotifyStatus>) {
    startTransition(async () => {
      setStatus(await action())
    })
  }

  if (!status.connected) {
    return (
      <a href="/api/spotify/connect" className="text-primary text-xs font-medium hover:underline">
        Connetti Spotify
      </a>
    )
  }

  if ("error" in status) {
    return (
      <div>
        <p className="text-ink-faint text-xs">Sessione scaduta.</p>
        <a
          href="/api/spotify/connect"
          className="text-primary mt-1 inline-block text-xs font-medium hover:underline"
        >
          Riconnetti
        </a>
      </div>
    )
  }

  if (!status.nowPlaying) {
    return <p className="text-ink-faint text-xs">Niente in ascolto ora.</p>
  }

  const { track, artist, albumArt, isPlaying, progressMs, durationMs } = status.nowPlaying

  return (
    <div>
      <div className="flex items-center gap-2.5">
        {albumArt ? (
          // eslint-disable-next-line @next/next/no-img-element -- miniatura piccola da dominio dinamico Spotify, next/image non aggiunge nulla qui
          <img
            src={albumArt}
            alt=""
            className="size-11 shrink-0 rounded-lg object-cover shadow-sm"
          />
        ) : (
          <div className="bg-muted size-11 shrink-0 rounded-lg" />
        )}
        {/* Testo + barra nella stessa colonna, accanto alla copertina —
            un solo blocco orizzontale (come icona+valore nel Meteo),
            non righe impilate una sotto l'altra su tutta la larghezza. */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold">{track}</p>
          <p className="text-ink-faint mt-0.5 truncate text-[0.68rem]">{artist}</p>
          {durationMs > 0 && (
            <SpotifyProgress
              key={`${track}-${progressMs}`}
              progressMs={progressMs}
              durationMs={durationMs}
              isPlaying={isPlaying}
            />
          )}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-center gap-1.5">
        <SpotifyControlButton
          label="Traccia precedente"
          pending={isPending}
          onClick={() => runCommand(previousSpotifyTrack)}
        >
          <SkipBack className="size-3.5" fill="currentColor" />
        </SpotifyControlButton>
        <SpotifyControlButton
          label={isPlaying ? "Pausa" : "Riproduci"}
          primary
          pending={isPending}
          onClick={() => runCommand(isPlaying ? pauseSpotifyPlayback : resumeSpotifyPlayback)}
        >
          {isPlaying ? (
            <Pause className="size-3.5" fill="currentColor" />
          ) : (
            <Play className="ml-0.5 size-3.5" fill="currentColor" />
          )}
        </SpotifyControlButton>
        <SpotifyControlButton
          label="Traccia successiva"
          pending={isPending}
          onClick={() => runCommand(nextSpotifyTrack)}
        >
          <SkipForward className="size-3.5" fill="currentColor" />
        </SpotifyControlButton>
      </div>

      <form action={disconnectSpotify} className="mt-1.5 text-center">
        <button
          type="submit"
          className="text-ink-faint hover:text-foreground text-[0.62rem] underline"
        >
          Scollega
        </button>
      </form>
    </div>
  )
}

export function SpotifySkeletonBody() {
  return <p className="text-ink-faint text-xs">Carico…</p>
}
