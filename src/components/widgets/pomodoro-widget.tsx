"use client"

import { useEffect, useRef, useState, useTransition } from "react"

import { useReportEmphasis } from "@/components/board/widget-shell"
import { incrementPomodoroSession } from "@/lib/actions/diario"
import { chiaveGiorno } from "@/lib/datetime"
import { cn } from "@/lib/utils"

type Phase = "focus" | "short" | "long"

const DURATIONS: Record<Phase, number> = {
  focus: 25 * 60,
  short: 5 * 60,
  long: 15 * 60,
}

const LABELS: Record<Phase, string> = {
  focus: "Studio",
  short: "Pausa breve",
  long: "Pausa lunga",
}

/**
 * Stile Pomofocus: 4 blocchi da 25 min con pausa breve (5 min) dopo i primi
 * 3, pausa lunga (15 min) dopo il 4°, poi si ricomincia. Il conteggio delle
 * sessioni è quello che decide la cadenza (ogni 4a è lunga) ed è anche il
 * "record" salvato sul giorno per poterlo confrontare nel tempo.
 */
export function PomodoroWidget({ initial }: { initial: number }) {
  const [sessioni, setSessioni] = useState(initial)
  const [phase, setPhase] = useState<Phase>("focus")
  const [left, setLeft] = useState(DURATIONS.focus)
  const [running, setRunning] = useState(false)
  const [, startTransition] = useTransition()

  // Timestamp assoluto di fine invece di scalare un secondo alla volta: se il
  // tab va in background (o il browser rallenta) i tick di setInterval
  // possono saltare o accumularsi — contando "a mano" un secondo per tick si
  // rischia di non accorgersi mai che il tempo è scaduto. Ricalcolando ogni
  // volta dal timestamp assoluto il countdown resta corretto qualunque cosa
  // succeda in mezzo.
  const endAtRef = useRef<number | null>(null)

  useEffect(() => {
    if (!running) {
      endAtRef.current = null
      return
    }
    if (endAtRef.current === null) endAtRef.current = Date.now() + left * 1000

    const tick = () => {
      const endAt = endAtRef.current
      if (endAt === null) return
      const remaining = Math.max(0, Math.round((endAt - Date.now()) / 1000))
      setLeft(remaining)
      if (remaining > 0) return

      setRunning(false)
      endAtRef.current = null
      if (phase === "focus") {
        const next = sessioni + 1
        setSessioni(next)
        startTransition(() => void incrementPomodoroSession(chiaveGiorno()))
        const nextPhase: Phase = next % 4 === 0 ? "long" : "short"
        setPhase(nextPhase)
        setLeft(DURATIONS[nextPhase])
      } else {
        setPhase("focus")
        setLeft(DURATIONS.focus)
      }
    }

    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
    // left intenzionalmente fuori: serve solo per fissare endAtRef quando
    // "running" diventa true (quel render lo vede comunque, essendo running
    // già tra le dipendenze) — includerlo ricreerebbe l'intervallo a ogni
    // tick, ogni secondo, invece che una volta sola all'avvio/al cambio fase.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, phase, sessioni])

  // "attenzione", non "urgente": una sessione che scorre è uno stato
  // calmo che acquisisce rilevanza, non qualcosa che richiede attenzione
  // immediata — nessun livello più forte per il Pomodoro.
  useReportEmphasis(phase === "focus" && running ? "attenzione" : "none")

  const mm = String(Math.floor(left / 60)).padStart(2, "0")
  const ss = String(left % 60).padStart(2, "0")
  const progress = (100 * (DURATIONS[phase] - left)) / DURATIONS[phase]

  return (
    <div>
      <p
        className={cn(
          "text-center text-[0.65rem] font-semibold tracking-wide uppercase",
          phase === "focus" ? "text-ink-faint" : "text-primary",
        )}
      >
        {LABELS[phase]}
      </p>
      <p className="text-center font-mono text-4xl font-medium tabular-nums">
        {mm}:{ss}
      </p>
      <div className="bg-muted mt-2 h-1 overflow-hidden rounded-full">
        <div
          className="bg-primary h-full transition-[width] duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => setRunning((value) => !value)}
          className="bg-brand-soft text-primary flex-1 rounded-md py-1.5 text-xs font-semibold"
        >
          {running ? "Pausa" : "Avvia"}
        </button>
        <button
          type="button"
          onClick={() => {
            setRunning(false)
            endAtRef.current = null
            setPhase("focus")
            setLeft(DURATIONS.focus)
          }}
          className="border-border text-ink-soft hover:text-foreground flex-1 rounded-md border py-1.5 text-xs"
        >
          Azzera
        </button>
      </div>
      <p className="text-ink-faint mt-2.5 text-center text-[0.7rem]">
        {sessioni} {sessioni === 1 ? "sessione" : "sessioni"} oggi
      </p>
    </div>
  )
}
