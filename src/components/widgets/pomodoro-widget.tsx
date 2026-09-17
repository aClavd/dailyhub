"use client"

import { SkipForward } from "lucide-react"
import { useCallback, useEffect, useRef, useState, useTransition } from "react"

import { useBoard } from "@/components/board/board-context"
import { useReportEmphasis } from "@/components/board/widget-shell"
import { useToast } from "@/components/dashboard/toast-context"
import { incrementPomodoroSession } from "@/lib/actions/diario"
import { chiaveGiorno } from "@/lib/datetime"
import { cn } from "@/lib/utils"

// Nessuna gestione d'errore prima: se incrementPomodoroSession falliva
// (rete, server di sviluppo che si stava riavviando — è successo per
// davvero: controllato sul database reale di Claudio, 2 sessioni salvate
// contro 3 fatte) la sessione contata in locale non risultava mai salvata
// e nessuno se ne accorgeva. Due tentativi in più con un piccolo ritardo;
// solo se falliscono anche quelli, un avviso nello stack di notifiche già
// esistente (toast-context.tsx) — non un sistema nuovo, e nessun rollback
// del contatore locale: la sessione l'hai fatta per davvero, resta
// visibile per te in questa pagina, solo onestà se il salvataggio non va
// a buon fine.
const RETRY_DELAYS_MS = [2000, 5000]

function saveSessionWithRetry(date: string, onFinalFailure: () => void, attempt = 0) {
  incrementPomodoroSession(date).catch(() => {
    if (attempt < RETRY_DELAYS_MS.length) {
      setTimeout(() => saveSessionWithRetry(date, onFinalFailure, attempt + 1), RETRY_DELAYS_MS[attempt])
    } else {
      onFinalFailure()
    }
  })
}

export type Phase = "focus" | "short" | "long"

// Esportate (Right Sidebar, Fase B): il Focus del pannello destro deriva
// "minuti di studio oggi" da sessioni × durata di un blocco — stessa fonte
// di verità, non un 25 ridigitato altrove.
export const DURATIONS: Record<Phase, number> = {
  focus: 25 * 60,
  short: 5 * 60,
  long: 15 * 60,
}

// Esportate (Sidebar System Refinement, Step 5): la sezione Focus del
// pannello destro mostra la stessa etichetta di fase del widget centrale
// quando una sessione è live — non un'etichetta ridigitata lì.
export const PHASE_LABELS: Record<Phase, string> = {
  focus: "Studio",
  short: "Pausa breve",
  long: "Pausa lunga",
}
const LABELS = PHASE_LABELS

// Rosso in studio, blu in pausa — riusa colori già nella palette (destructive
// e il blu di Libero mail), nessuna tinta nuova aggiunta al design system.
// Esportate (Sidebar System Refinement, Step 5): la sezione Focus del
// pannello destro usa la stessa coppia di colori per fase, non una scelta
// propria.
export const PHASE_TEXT: Record<Phase, string> = {
  focus: "text-destructive",
  short: "text-libero-fg",
  long: "text-libero-fg",
}
export const PHASE_BAR: Record<Phase, string> = {
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
  const { patchTodayDiario, setPomodoroLive } = useBoard()
  const pushToast = useToast()
  const [sessioni, setSessioni] = useState(initial)
  const [phase, setPhase] = useState<Phase>("focus")
  const [left, setLeft] = useState(DURATIONS.focus)
  const [running, setRunning] = useState(false)

  // Timestamp assoluto di fine invece di scalare un secondo alla volta: se il
  // tab va in background (o il browser rallenta) i tick di setInterval
  // possono saltare o accumularsi — contando "a mano" un secondo per tick si
  // rischia di non accorgersi mai che il tempo è scaduto. Ricalcolando ogni
  // volta dal timestamp assoluto il countdown resta corretto qualunque cosa
  // succeda in mezzo. `endAtRef` pilota il tick loop qui sotto (invariato);
  // `endAt` (stato, sotto) è lo STESSO valore ma tenuto anche come stato,
  // solo per essere condiviso col pannello destro (Right Sidebar Focus,
  // Step 5) — aggiornato negli stessi punti in cui lo è endAtRef, mai
  // riletto dal ref durante un render (rischierebbe di leggere un valore
  // di un istante prima di quando l'effect sotto lo aggiorna).
  const endAtRef = useRef<number | null>(null)
  const [endAt, setEndAt] = useState<number | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const [, startTransition] = useTransition()

  // Segnala in su il conteggio di oggi — stesso motivo/stesso schema di
  // diario-widget.tsx (vedi lì per i commenti generali): senza, il Focus
  // nel pannello destro restava fermo al valore letto al caricamento
  // della pagina anche dopo aver completato una sessione qui.
  useEffect(() => {
    patchTodayDiario({ pomodoroSessions: sessioni })
  }, [sessioni, patchTodayDiario])

  // Avvia/mette in pausa — estratta da useCallback (prima era inline
  // nell'onClick) perché ora serve anche fuori da qui: il pannello destro
  // (Right Sidebar Focus) la richiama tramite pomodoroLive.toggleRunning
  // sotto, stesso identico pulsante Avvia/Pausa, non uno nuovo che duplica
  // la logica dell'AudioContext.
  const toggleRunning = useCallback(() => {
    if (!running) {
      // L'AudioContext va creato durante un gesto reale dell'utente — crearlo
      // dopo, dentro il tick del timer, verrebbe bloccato dalle policy di
      // autoplay dei browser. Un click dal pannello destro è comunque un
      // gesto reale dell'utente, la policy resta rispettata.
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext()
      try {
        playClick(audioCtxRef.current)
      } catch {
        // niente audio, pazienza
      }
    }
    setRunning((value) => !value)
  }, [running])

  // Chiude il blocco corrente come se il countdown fosse arrivato a zero —
  // condivisa tra lo scatto naturale del timer, il pulsante "salta"
  // (Pomofocus la chiama così: salti alla fine, non annulli e basta) e ora
  // anche il pannello destro (pomodoroLive.skip) — un solo punto che decide
  // fase successiva/conteggio/suono, non copie della stessa logica.
  const completePhase = useCallback(() => {
    setRunning(false)
    endAtRef.current = null
    setEndAt(null)
    try {
      if (audioCtxRef.current) playChime(audioCtxRef.current)
    } catch {
      // niente audio, pazienza — non deve interrompere il cambio di fase
    }
    if (phase === "focus") {
      const next = sessioni + 1
      setSessioni(next)
      const date = chiaveGiorno()
      startTransition(() => {
        saveSessionWithRetry(date, () => {
          pushToast({
            id: `pomodoro-save-failed-${date}-${next}`,
            title: "Sessione Pomodoro non salvata",
            label: "Il conteggio di oggi potrebbe non essere aggiornato sul server.",
            accent: "attenzione",
          })
        })
      })
      const nextPhase: Phase = next % 4 === 0 ? "long" : "short"
      setPhase(nextPhase)
      setLeft(DURATIONS[nextPhase])
    } else {
      setPhase("focus")
      setLeft(DURATIONS.focus)
    }
    // pushToast/startTransition intenzionalmente fuori: contesto/hook
    // stabili, non serve ricrearli tra le dipendenze.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, sessioni])

  useEffect(() => {
    if (!running) {
      endAtRef.current = null
      return
    }
    if (endAtRef.current === null) {
      endAtRef.current = Date.now() + left * 1000
      setEndAt(endAtRef.current)
    }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, phase, sessioni, completePhase])

  // Segnala in su lo stato live per la sezione Focus del pannello destro
  // (Right Sidebar Step 5) — SOLO ai cambi di fase/running/endAt (rari),
  // mai a ogni tick: aggiornare qui un numero ogni secondo farebbe
  // ri-renderizzare tutta l'app che consuma useBoard() ogni secondo (board,
  // rail, right-panel). Il pannello destro calcola il proprio countdown da
  // `endAt` con un setInterval tutto suo — un secondo orologio che legge la
  // stessa ora vera, non un secondo timer (nessuna logica di fase/conteggio
  // duplicata: toggleRunning/skip sotto SONO questi stessi, non copie).
  useEffect(() => {
    setPomodoroLive({ phase, running, endAt, pausedLeft: left, toggleRunning, skip: completePhase })
    return () => setPomodoroLive(null)
    // left intenzionalmente fuori: pausedLeft deve restare il valore di
    // quando running/endAt sono cambiati l'ultima volta (il momento giusto
    // per "quanto restava"), non aggiornarsi ogni tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, running, endAt, toggleRunning, completePhase, setPomodoroLive])

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
          onClick={toggleRunning}
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
            setEndAt(null)
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
