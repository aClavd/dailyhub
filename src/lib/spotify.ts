import "server-only"

const AUTHORIZE_URL = "https://accounts.spotify.com/authorize"
const TOKEN_URL = "https://accounts.spotify.com/api/token"
const SCOPES = "user-read-currently-playing user-read-playback-state"

/**
 * Origine affidabile della richiesta — apposta non `new URL(request.url)
 * .origin`: in Next.js 16 dev (Turbopack) `request.url` in una route
 * viene silenziosamente riscritto sull'indirizzo "canonico" del dev
 * server (es. localhost) anche quando l'host reale della richiesta è
 * diverso (es. 127.0.0.1, che è quello che Spotify richiede) — stesso bug
 * dietro al redirect_uri_mismatch di Google risolto via patch a next-auth
 * (vedi patches/). Qui non possiamo patchare Spotify, quindi si aggira
 * alla radice: `AUTH_URL`, se impostata, fissa l'indirizzo esplicitamente
 * (dev e produzione); altrimenti si ricava dagli header della richiesta,
 * che restano affidabili anche quando `request.url` non lo è.
 */
export function requestOrigin(request: Request): string {
  if (process.env.AUTH_URL) return new URL(process.env.AUTH_URL).origin
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host")
  const proto = request.headers.get("x-forwarded-proto") ?? "http"
  return `${proto}://${host}`
}

/** Stesso path registrato sul pannello Spotify (vedi docs/SETUP-SPOTIFY.md). */
export function spotifyRedirectUri(origin: string): string {
  return `${origin}/api/auth/callback/spotify`
}

export function spotifyAuthorizeUrl(origin: string, state: string): string {
  const url = new URL(AUTHORIZE_URL)
  url.searchParams.set("client_id", process.env.AUTH_SPOTIFY_ID ?? "")
  url.searchParams.set("response_type", "code")
  url.searchParams.set("redirect_uri", spotifyRedirectUri(origin))
  url.searchParams.set("scope", SCOPES)
  url.searchParams.set("state", state)
  return url.toString()
}

type SpotifyTokens = {
  access_token: string
  refresh_token?: string
  expires_in: number
}

function basicAuthHeader() {
  const id = process.env.AUTH_SPOTIFY_ID ?? ""
  const secret = process.env.AUTH_SPOTIFY_SECRET ?? ""
  return `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`
}

/** Scambia il code ricevuto sul callback con access + refresh token. */
export async function exchangeSpotifyCode(
  code: string,
  origin: string,
): Promise<SpotifyTokens> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuthHeader(),
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: spotifyRedirectUri(origin),
    }),
  })
  if (!res.ok) throw new Error(`Spotify token exchange failed: HTTP ${res.status}`)
  return res.json()
}

/** Rinnova l'access token scaduto. Spotify a volte non restituisce un nuovo
 * refresh_token: in quel caso resta valido quello vecchio. */
export async function refreshSpotifyToken(refreshToken: string): Promise<SpotifyTokens> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuthHeader(),
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  })
  if (!res.ok) throw new Error(`Spotify token refresh failed: HTTP ${res.status}`)
  return res.json()
}

export type SpotifyNowPlaying = {
  isPlaying: boolean
  track: string
  artist: string
} | null

/**
 * Cosa sta suonando ora. `null` = niente in riproduzione (204, stato normale
 * di Spotify quando non stai ascoltando nulla, non un errore).
 */
export async function fetchSpotifyNowPlaying(accessToken: string): Promise<SpotifyNowPlaying> {
  const res = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  })
  if (res.status === 204 || res.status === 404) return null
  if (!res.ok) throw new Error(`Spotify now-playing failed: HTTP ${res.status}`)
  const data = await res.json()
  if (!data?.item) return null
  return {
    isPlaying: Boolean(data.is_playing),
    track: data.item.name as string,
    artist: (data.item.artists ?? []).map((a: { name: string }) => a.name).join(", "),
  }
}
