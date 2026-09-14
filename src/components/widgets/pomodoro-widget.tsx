"use client"

import { SkipForward } from "lucide-react"
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

// Rosso in studio, blu in pausa — riusa colori già nella palette (destructive
// e il blu di Libero mail), nessuna tinta nuova aggiunta al design system.
const PHASE_TEXT: Record<Phase, string> = {
  focus: "text-destructive",
  short: "text-libero-fg",
  long: "text-libero-fg",
}
const PHASE_BAR: Record<Phase, string> = {
  focus: "bg-destructive",
  short: "bg-libero-fg",
  long: "bg-libero-fg",
}

/** Due note morbide in sequenza, sintetizzate via Web Audio — niente file
 * audio da scaricare o servire. L'AudioContext va creato durante un gesto
 * reale dell'utente (il click su Avvia, vedi sotto) per rispettare le
 * policy di autoplay dei browser; qui viene solo riusato. */
function playChime(ctx: AudioContext) {
  const now = ctx.currentTime
  for (const [i, freq] of [880, 1175].entries()) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = "sine"
    osc.frequency.value = freq
    const start = now + i * 0.16
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(0.25, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(start)
    osc.stop(start + 0.4)
  }
}

/** Un "tick" secco e breve, come lo scatto di un cronometro fisico — allo
 * stesso modo sintetizzato, nessun file audio. Suona all'avvio (non alla
 * pausa), distinto dalla campanella morbida di fine blocco. */
function playClick(ctx: AudioContext) {
  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = "square"
  osc.frequency.value = 1800
  gain.gain.setValueAtTime(0.2, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + 0.06)
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
  const audioCtxRef = useRef<AudioContext | null>(null)

  // Chiude il blocco corrente come se il countdown fosse arrivato a zero —
  // condivisa tra lo scatto naturale del timer e il pulsante "salta"
  // (Pomofocus la chiama così: salti alla fine, non annulli e basta), un
  // solo punto che decide fase successiva/conteggio/suono invece di due
  // copie della stessa logica.
  function completePhase() {
    setRunning(false)
    endAtRef.current = null
    try {
      if (audioCtxRef.current) playChime(audioCtxRef.current)
    } catch {
      // niente audio, pazienza — non deve interrompere il cambio di fase
    }
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
      completePhase()
    }

    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
    // left intenzionalmente fuori: serve solo per fissare endAtRef quando
    // "running" diventa true (quel render lo vede comunque, essendo running
    // già tra le dipendenze) — includerlo ricreerebbe l'intervallo a ogni
    // tick, ogni secondo, invece che una volta sola all'avvio/al cambio fase.
    // completePhase intenzionalmente fuori: è una funzione normale
    // ridefinita a ogni render, chiuderebbe comunque sullo stesso
    // phase/sessioni già nelle dipendenze qui sotto.
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
          PHASE_TEXT[phase],
        )}
      >
        {LABELS[phase]}
      </p>
      <p
        className={cn(
          "text-center font-mono text-4xl font-medium tabular-nums transition-colors",
          PHASE_TEXT[phase],
        )}
      >
        {mm}:{ss}
      </p>
      <div className="bg-muted mt-2 h-1 overflow-hidden rounded-full">
        <div
          className={cn("h-full transition-[width,background-color] duration-300", PHASE_BAR[phase])}
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => {
            // L'AudioContext va creato durante un gesto reale dell'utente
            // (questo click) — crearlo dopo, dentro il tick del timer,
            // verrebbe bloccato dalle policy di autoplay dei browser.
            if (!running) {
              if (!audioCtxRef.current) audioCtxRef.current = new AudioContext()
              try {
                playClick(audioCtxRef.current)
              } catch {
                // niente audio, pazienza
              }
            }
            setRunning((value) => !value)
          }}
          className="bg-brand-soft text-primary flex-1 rounded-md py-1.5 text-xs font-semibold"
        >
          {running ? "Pausa" : "Avvia"}
        </button>
        <button
          type="button"
          onClick={completePhase}
          aria-label="Salta al blocco successivo"
          title="Salta al blocco successivo"
          className="border-border text-ink-soft hover:text-foreground grid shrink-0 place-items-center rounded-md border px-2.5"
        >
          <SkipForward className="size-3.5" fill="currentColor" />
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
