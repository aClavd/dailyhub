"use client"

import { useEffect, useState } from "react"

import { useLocalStorage } from "@/lib/use-local-storage"

type Coords = { lat: number; lon: number }
type Snapshot = { tempC: number; code: number; fetchedAt: number }
type Status = "idle" | "denied" | "error"

// Sotto questa età il meteo salvato si riusa invece di ri-scaricarlo.
const STALE_MS = 30 * 60 * 1000

/** Codici WMO (weathercode) di Open-Meteo, ridotti alle categorie che contano qui. */
function describeCode(code: number): { label: string; icon: string } {
  if (code === 0) return { label: "Sereno", icon: "☀️" }
  if (code <= 2) return { label: "Poco nuvoloso", icon: "🌤️" }
  if (code === 3) return { label: "Nuvoloso", icon: "☁️" }
  if (code === 45 || code === 48) return { label: "Nebbia", icon: "🌫️" }
  if (code >= 51 && code <= 57) return { label: "Pioggerella", icon: "🌦️" }
  if (code >= 61 && code <= 67) return { label: "Pioggia", icon: "🌧️" }
  if (code >= 71 && code <= 77) return { label: "Neve", icon: "🌨️" }
  if (code >= 80 && code <= 82) return { label: "Rovesci", icon: "🌦️" }
  if (code >= 95) return { label: "Temporale", icon: "⛈️" }
  return { label: "Variabile", icon: "🌡️" }
}

function hasGeolocation() {
  return typeof navigator !== "undefined" && "geolocation" in navigator
}

/**
 * Meteo vero via Open-Meteo (gratis, nessuna chiave API). Posizione dal
 * permesso del browser; se negato o non disponibile, ricerca manuale della
 * città (API di geocoding, stesso servizio). Coordinate e ultima lettura
 * restano in localStorage — un solo giro all'API ogni mezz'ora, non a ogni
 * apertura della dashboard.
 */
export function MeteoWidget() {
  const [coords, setCoords] = useLocalStorage<Coords | null>("dailyhub:meteo:coords", null)
  const [snapshot, setSnapshot] = useLocalStorage<Snapshot | null>("dailyhub:meteo:snapshot", null)
  // Sempre "idle" al primo giro, server e client uguali — "geolocation" in
  // navigator non esiste durante il rendering server (Node, niente
  // `navigator`) ma esiste nel browser: deciderlo già nello stato iniziale
  // dava HTML diverso tra i due, quindi un errore di hydration. Il controllo
  // vero si fa nell'effect qui sotto, che gira solo lato client, mai in SSR.
  const [status, setStatus] = useState<Status>("idle")
  const [cityDraft, setCityDraft] = useState("")

  // Prima volta (niente coordinate salvate): chiede la posizione al browser.
  // Il ramo "non supportata" passa da queueMicrotask apposta: è un valore
  // noto in modo sincrono, ma un setState sincrono nel corpo dell'effect è
  // vietato dal linter (react-hooks/set-state-in-effect) — un tick dopo è
  // comunque istantaneo per chi guarda.
  useEffect(() => {
    if (coords || status !== "idle") return
    if (!hasGeolocation()) {
      queueMicrotask(() => setStatus("denied"))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => setStatus("denied"),
      { timeout: 8000 },
    )
  }, [coords, status, setCoords])

  // Ha le coordinate: scarica il meteo se non ne ha già uno abbastanza
  // recente (rivalidazione silenziosa: se ne ha uno stantio lo mostra
  // comunque mentre aggiorna in background, niente sfarfallio a "loading").
  useEffect(() => {
    if (!coords || (snapshot && Date.now() - snapshot.fetchedAt < STALE_MS)) return
    let cancelled = false
    const url = new URL("https://api.open-meteo.com/v1/forecast")
    url.searchParams.set("latitude", String(coords.lat))
    url.searchParams.set("longitude", String(coords.lon))
    url.searchParams.set("current", "temperature_2m,weather_code")
    url.searchParams.set("timezone", "auto")
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        setSnapshot({
          tempC: data.current.temperature_2m,
          code: data.current.weather_code,
          fetchedAt: Date.now(),
        })
      })
      .catch(() => {
        if (!cancelled) setStatus("error")
      })
    return () => {
      cancelled = true
    }
    // fresh intenzionalmente fuori: serve solo a decidere se questo giro
    // parte, non deve ri-lanciare il fetch quando la risposta lo aggiorna.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords, setSnapshot])

  const searchCity = async () => {
    const name = cityDraft.trim()
    if (!name) return
    try {
      const url = new URL("https://geocoding-api.open-meteo.com/v1/search")
      url.searchParams.set("name", name)
      url.searchParams.set("count", "1")
      url.searchParams.set("language", "it")
      const res = await fetch(url)
      const data = await res.json()
      const hit = data.results?.[0]
      if (!hit) {
        setStatus("error")
        return
      }
      setSnapshot(null) // forza un nuovo giro col meteo delle nuove coordinate
      setCoords({ lat: hit.latitude, lon: hit.longitude })
      setStatus("idle")
    } catch {
      setStatus("error")
    }
  }

  if (snapshot && coords) {
    const { label, icon } = describeCode(snapshot.code)
    return (
      <div className="flex h-full flex-col justify-center">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl" aria-hidden>
            {icon}
          </span>
          <span className="font-mono text-3xl font-medium tabular-nums">
            {Math.round(snapshot.tempC)}°
          </span>
        </div>
        <p className="text-ink-faint mt-1 text-xs">{label}</p>
      </div>
    )
  }

  if (status === "idle") {
    return <p className="text-ink-faint text-xs">Recupero il meteo…</p>
  }

  return (
    <div>
      <p className="text-ink-soft text-xs">
        {status === "denied"
          ? "Permesso di posizione negato — cerca la tua città."
          : "Città non trovata, riprova."}
      </p>
      <div className="mt-2 flex gap-1.5">
        <input
          value={cityDraft}
          onChange={(event) => setCityDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              void searchCity()
            }
          }}
          placeholder="Nome città…"
          className="bg-muted border-border focus:outline-primary min-w-0 flex-1 rounded-md border px-2 py-1 text-xs focus:outline-2"
        />
        <button
          type="button"
          onClick={() => void searchCity()}
          className="border-border text-ink-soft hover:text-foreground shrink-0 rounded-md border px-2 text-xs"
        >
          Cerca
        </button>
      </div>
    </div>
  )
}
