import { disconnectSpotify } from "@/lib/actions/spotify"
import type { SpotifyStatus } from "@/lib/queries/spotify"

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

  return (
    <div>
      <p className="truncate text-xs font-medium">{status.nowPlaying.track}</p>
      <p className="text-ink-faint mt-0.5 truncate text-[0.68rem]">{status.nowPlaying.artist}</p>
      <form action={disconnectSpotify} className="mt-1.5">
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
