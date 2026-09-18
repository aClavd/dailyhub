"use client"

import { useBoard } from "@/components/board/board-context"
import { DialogClose, DialogPopup, DialogTitle } from "@/components/ui/dialog"
import { DURATIONS, PHASE_BAR, PHASE_LABELS, PHASE_TEXT } from "@/components/widgets/pomodoro-widget"
import { buildBriefSentences, type AttentionSignals } from "@/lib/attention-signals"
import { cn } from "@/lib/utils"

import { AttentionRow, FocusActive, MailRow, SectionLabel, StaticClock } from "./right-panel"

const MAX_MAIL_ROWS = 3

/**
 * Attenzione mobile (Mobile Attention v1) — non "RightPanel desktop dentro
 * un Dialog": una superficie compatta, sola andata (nessuna maniglia di
 * riordino/rimozione qui, non è un altro posto per gestire la board),
 * ordine Daily Brief → Attenzione → Focus → Oggi. Niente Azioni rapide:
 * già altrove (Libreria per "aggiungi un blocco", Memoria per "cerca") —
 * ripeterle qui sarebbe la duplicazione che questo giro deve evitare.
 *
 * Dati: TUTTI ricevuti come prop, calcolati una sola volta da chi apre
 * questo dialog (top-bar.tsx, con useLiveAttention — la stessa identica
 * funzione/lo stesso polling già estratti da right-panel.tsx). Questo
 * componente non fa nessuna fetch/query propria: è pura presentazione.
 */
export function AttentionDialog({
  greetingWord,
  habitsDone,
  studyMinutes,
  pomodoroSessions,
  habitList,
  ...signals
}: AttentionSignals & {
  greetingWord: string | null
  habitsDone: number
  studyMinutes: number
  pomodoroSessions: number
  habitList: readonly string[]
}) {
  const { hasWidget, addWidget, pomodoroLive } = useBoard()
  const { showEvent, eventSignal, eventLevel, eventTimeLabel, importantMail, showDiarioReminder, attentionCount } =
    signals
  const briefSentences = buildBriefSentences(signals)

  const focusState: "idle-unmounted" | "idle-mounted" | "paused" | "running" = !pomodoroLive
    ? "idle-unmounted"
    : pomodoroLive.running
      ? "running"
      : pomodoroLive.pausedLeft < DURATIONS[pomodoroLive.phase]
        ? "paused"
        : "idle-mounted"

  // Righe di Attenzione — stessa fonte di right-panel.tsx, senza
  // useExitingRows (il dialog è montato solo mentre è aperto: nessuna
  // continuità visiva da mantenere tra un'apertura e l'altra, a
  // differenza del pannello desktop che resta sempre a schermo).
  const attentionRows =
    (showEvent && eventSignal
      ? [
          {
            key: `event-${eventSignal.event.id}`,
            node: (
              <AttentionRow
                type="agenda"
                title={eventSignal.event.title}
                time={eventTimeLabel}
                urgent={eventLevel === "urgente"}
                onClick={() => {
                  if (!hasWidget("agenda")) addWidget("agenda")
                }}
              />
            ),
          },
        ]
      : []
    )
      .concat(
        importantMail.slice(0, MAX_MAIL_ROWS).map((m) => ({
          key: `mail-${m.provider}-${m.id}`,
          node: <MailRow message={m} />,
        })),
      )
      .concat(
        showDiarioReminder
          ? [
              {
                key: "diario-reminder",
                node: (
                  <AttentionRow
                    type="diario"
                    title="Diario di oggi"
                    time="da scrivere"
                    urgent={false}
                    onClick={() => {
                      if (!hasWidget("diario")) addWidget("diario")
                    }}
                  />
                ),
              },
            ]
          : [],
      )

  return (
    <DialogPopup>
      <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3.5">
        <div>
          <DialogTitle>Attenzione</DialogTitle>
          <p className="text-ink-faint mt-0.5 text-[0.68rem]">Cosa merita uno sguardo adesso</p>
        </div>
        <DialogClose
          aria-label="Chiudi"
          className="relative text-ink-faint hover:bg-muted hover:text-foreground grid size-7 shrink-0 place-items-center rounded-md text-base leading-none after:absolute after:-inset-2 after:content-['']"
        >
          &times;
        </DialogClose>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-4">
        <section>
          <SectionLabel>Daily Brief</SectionLabel>
          {attentionCount === 0 ? (
            <p className="text-ink-soft mt-1.5 text-sm leading-snug">Tutto tranquillo per ora.</p>
          ) : (
            <div className="mt-1.5 space-y-0.5">
              {greetingWord && (
                <p className="text-ink-soft text-sm leading-snug">
                  {greetingWord.charAt(0).toUpperCase() + greetingWord.slice(1)}.
                </p>
              )}
              {briefSentences.map((sentence) => (
                <p key={sentence} className="text-ink-soft text-sm leading-snug">
                  {sentence}
                </p>
              ))}
            </div>
          )}
        </section>

        {attentionRows.length > 0 && (
          <section>
            <SectionLabel>Attenzione</SectionLabel>
            <div className="mt-1.5 flex flex-col gap-1.5">
              {attentionRows.map(({ key, node }) => (
                <div key={key}>{node}</div>
              ))}
              {importantMail.length > MAX_MAIL_ROWS && (
                <p className="text-ink-faint px-1 text-[0.68rem]">
                  +{importantMail.length - MAX_MAIL_ROWS} altre mail
                </p>
              )}
            </div>
          </section>
        )}

        <section className="border-border border-t pt-4">
          <SectionLabel>Focus</SectionLabel>
          {focusState === "running" && pomodoroLive?.endAt ? (
            <div className="mt-1.5">
              <div className="flex items-center justify-between gap-2">
                <p className={cn("text-sm font-medium", PHASE_TEXT[pomodoroLive.phase])}>
                  {PHASE_LABELS[pomodoroLive.phase]}
                </p>
                <button
                  type="button"
                  onClick={pomodoroLive.toggleRunning}
                  className="text-primary hover:bg-brand-soft active:translate-y-px shrink-0 rounded-md px-2 py-1 text-[0.68rem] font-semibold transition-colors duration-100"
                >
                  Pausa
                </button>
              </div>
              <FocusActive
                endAt={pomodoroLive.endAt}
                totalSec={DURATIONS[pomodoroLive.phase]}
                textClass={PHASE_TEXT[pomodoroLive.phase]}
                barClass={PHASE_BAR[pomodoroLive.phase]}
              />
            </div>
          ) : focusState === "paused" && pomodoroLive ? (
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <p className="text-ink-soft min-w-0 flex-1 text-sm">
                <StaticClock seconds={pomodoroLive.pausedLeft} /> · In pausa
              </p>
              <button
                type="button"
                onClick={pomodoroLive.toggleRunning}
                className="text-primary hover:bg-brand-soft active:translate-y-px shrink-0 rounded-md px-2 py-1 text-[0.68rem] font-semibold transition-colors duration-100"
              >
                Riprendi
              </button>
            </div>
          ) : (
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <p className="text-ink-soft min-w-0 flex-1 text-sm">
                {pomodoroSessions === 0
                  ? "Nessuna sessione ancora oggi."
                  : `${pomodoroSessions} ${pomodoroSessions === 1 ? "sessione" : "sessioni"} · ~${studyMinutes} min`}
              </p>
              <button
                type="button"
                onClick={() => {
                  if (pomodoroLive) pomodoroLive.toggleRunning()
                  else if (!hasWidget("pomodoro")) addWidget("pomodoro")
                }}
                className="text-primary hover:bg-brand-soft active:translate-y-px shrink-0 rounded-md px-2 py-1 text-[0.68rem] font-semibold transition-colors duration-100"
              >
                {pomodoroLive ? "Avvia" : "Vai"}
              </button>
            </div>
          )}
        </section>

        {habitList.length > 0 && (
          <p className="text-ink-faint -mt-2 text-[0.68rem]">
            <span className="font-semibold tracking-[0.04em] uppercase">Oggi</span> {habitsDone}/{habitList.length}{" "}
            abitudini
          </p>
        )}
      </div>
    </DialogPopup>
  )
}
