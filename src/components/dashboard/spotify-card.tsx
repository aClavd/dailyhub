import { Pause, Play, SkipBack, SkipForward } from "lucide-react"

import {
  disconnectSpotify,
  nextSpotifyTrack,
  pauseSpotifyPlayback,
  previousSpotifyTrack,
  resumeSpotifyPlayback,
} from "@/lib/actions/spotify"
import type { SpotifyStatus } from "@/lib/queries/spotify"

import { SpotifyControlButton } from "./spotify-controls"

/** Contenuto della card Spotify in testata (la cornice la mette header-flanking-row.tsx). */
export function SpotifyBody({ status }: { status: SpotifyStatus }) {
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

  const { track, artist, albumArt, isPlaying } = status.nowPlaying

  return (
    <div>
      <div className="flex items-center gap-2">
        {albumArt ? (
          // eslint-disable-next-line @next/next/no-img-element -- miniatura piccola da dominio dinamico Spotify, next/image non aggiunge nulla qui
          <img src={albumArt} alt="" className="size-9 shrink-0 rounded-md object-cover" />
        ) : (
          <div className="bg-muted size-9 shrink-0 rounded-md" />
        )}
        <div className="min-w-0">
          <p className="truncate text-xs font-medium">{track}</p>
          <p className="text-ink-faint mt-0.5 truncate text-[0.68rem]">{artist}</p>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-center gap-4">
        <form action={previousSpotifyTrack}>
          <SpotifyControlButton label="Traccia precedente">
            <SkipBack className="size-3.5" fill="currentColor" />
          </SpotifyControlButton>
        </form>
        <form action={isPlaying ? pauseSpotifyPlayback : resumeSpotifyPlayback}>
          <SpotifyControlButton label={isPlaying ? "Pausa" : "Riproduci"}>
            {isPlaying ? (
              <Pause className="size-4" fill="currentColor" />
            ) : (
              <Play className="size-4" fill="currentColor" />
            )}
          </SpotifyControlButton>
        </form>
        <form action={nextSpotifyTrack}>
          <SpotifyControlButton label="Traccia successiva">
            <SkipForward className="size-3.5" fill="currentColor" />
          </SpotifyControlButton>
        </form>
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
