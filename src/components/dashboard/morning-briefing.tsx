"use client"

import type { CSSProperties, ReactNode } from "react"
import { useEffect, useState } from "react"

import type { DiarioState } from "@/lib/diario"
import type { CalendarResult } from "@/lib/google/calendar"
import type { MailResult } from "@/lib/mail"
import {
  buildMorningBriefing,
  type MorningBriefingData,
  type MorningBriefingMailRow,
} from "@/lib/morning-briefing"
import type { MailFilterSummary } from "@/lib/queries/mail-filters"
import { useLocalStorage } from "@/lib/use-local-storage"
import { cn } from "@/lib/utils"

import { REMINDER_HOUR } from "./diario-reminder"

// Motion Language v1, livello STANDARD — stesso "vocabolario" già in uso in
// right-panel.tsx/toast-context.tsx: opacità + una piccola risalita, mai
// scale/bounce (Morning Briefing v1, "PRESENTATION / ANIMATION").
// animation-duration-200 (non duration-200): niente hover/transition-colors
// su questi blocchi, ma stessa convenzione del resto della sessione per non
// legare per sbaglio questa durata a un'altra proprietà in futuro.
const ENTER =
  "animate-in fade-in-0 slide-in-from-bottom-1 animation-duration-200 motion-reduce:animate-none"
const STEP_MS = 70

/** Ritardo di comparsa "a battute": un contatore avanza di un passo per
 * ogni blocco che compare DAVVERO (Mentre dormivi/Attenzione/Oggi possono
 * mancare — "if a section does not exist, skip it completely", anche nella
 * sequenza di animazione: niente buchi di tempo morto per una sezione
 * assente). Un `let` locale mutato durante il render, non uno stato — si
 * ricalcola uguale a ogni render, non serve persistenza. */
function makeStepper() {
  let i = 0
  return (): CSSProperties => ({ animationDelay: `${i++ * STEP_MS}ms` })
}

/**
 * Morning Briefing v1 — schermata temporanea mostrata alla prima apertura
 * significativa della giornata, al posto della board (Morning Briefing
 * Architecture Audit v1). Nessun dato nuovo: compone eventsInitial/
 * mailInitial/mailFilters/diarioInitial, già letti da page.tsx per
 * RightPanel, tramite lib/morning-briefing.ts (che a sua volta riusa
 * lib/attention-signals.ts, la stessa fonte del Daily Brief — "una sola
 * logica, più presentazioni").
 *
 * `resolved` parte `false` sia lato server sia al primo render client (mai
 * `null`/`undefined` impliciti): finché non è vero non si sa ancora se
 * mostrare il briefing o la board, quindi non si mostra NESSUNO dei due (si
 * evita così sia un lampo "board poi briefing" sia il caso opposto — vedi
 * il test case "riapertura dopo aver già visto il briefing oggi: la board
 * deve aprirsi direttamente"). Il costo è un istante di schermo vuoto al
 * primo render, non contenuto sbagliato mostrato per un istante.
 */
export function MorningBriefingGate({
  children,
  events,
  mail,
  filters,
  diarioInitial,
  todayKey,
  firstName,
}: {
  children: ReactNode
  events: CalendarResult
  mail: MailResult
  filters: MailFilterSummary[]
  diarioInitial: DiarioState
  todayKey: string
  firstName?: string
}) {
  const [seen, setSeen] = useLocalStorage(`dailyhub:briefing-seen:${todayKey}`, false)
  // `now` dipende dall'orologio di chi guarda, non da quello del server che
  // ha reso la pagina — stesso motivo/stessa tecnica di right-panel.tsx
  // (greetingWord: calcolato solo in un effect, mai durante il render, per
  // evitare un mismatch di idratazione). Finché resta `null` (server e
  // primo render client) non si mostra NÉ il briefing NÉ la board — vedi
  // il commento sul componente qui sopra.
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    const set = () => setNow(new Date())
    set()
  }, [])

  if (!now) return null
  if (seen) return <>{children}</>

  // Composizione pura, calcolata durante il render (non in stato: non
  // dipende da nulla che non sia già disponibile qui — props + `now`).
  const data = buildMorningBriefing({
    events,
    mail,
    filters,
    diario: diarioInitial,
    afterReminderHour: now.getHours() >= REMINDER_HOUR,
    now,
  })

  return <MorningBriefingScreen data={data} firstName={firstName} onEnter={() => setSeen(true)} />
}

function MorningBriefingScreen({
  data,
  firstName,
  onEnter,
}: {
  data: MorningBriefingData
  firstName?: string
  onEnter: () => void
}) {
  const step = makeStepper()
  const showOvernight = data.overnightMail.count > 0
  const showAttention = data.attention.hasItem

  return (
    // min-h-dvh (non solo flex-1): flex-1 da solo basta SOLO se l'intera
    // catena html{h-full}->body{min-h-full}->...->qui riesce a risolvere
    // un'altezza percentuale reale (verificato dal vivo: funziona in una
    // scheda normale) — ma non ha nessuna misura propria, dipende in toto
    // da quella catena. min-h-dvh dà al briefing un pavimento di altezza
    // indipendente (la vera altezza di viewport visibile), che non deve
    // ereditare nulla da body/html/i Provider sopra — coerente con "il
    // briefing è un'esperienza a pagina intera, non deve ereditare la
    // geometria della board/dei suoi contenitori". w-full: stessa idea per
    // la larghezza, esplicita invece di implicita (un <div> è già 100%
    // di suo, ma qui non è lasciato al caso). flex-1 resta: se il
    // contenitore flex sopra è già alto quanto la viewport (caso normale),
    // non cambia nulla; se quella catena fallisse, min-h-dvh è comunque
    // un pavimento (min-height vince sempre su un flex-basis più piccolo).
    <div className="flex min-h-dvh w-full flex-1 flex-col bg-background">
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-6 py-16 sm:px-8">
        <h1
          className={cn(
            "font-heading text-4xl font-medium tracking-tight text-balance lowercase sm:text-5xl",
            ENTER,
          )}
          style={step()}
        >
          {data.greetingWord}
          {firstName ? `, ${firstName}` : ""}
        </h1>
        <p
          className={cn("text-ink-faint mt-2.5 font-mono text-[0.7rem] tracking-[0.12em] uppercase", ENTER)}
          style={step()}
        >
          {data.dateLabel}
        </p>

        {showOvernight && (
          <section className={cn("mt-10", ENTER)} style={step()}>
            <SectionLabel>Mentre dormivi</SectionLabel>
            <p className="text-ink-soft mt-2 text-[0.95rem] leading-snug">
              {data.overnightMail.count}{" "}
              {data.overnightMail.count === 1 ? "email importante è arrivata" : "email importanti sono arrivate"}.
            </p>
          </section>
        )}

        {showOvernight && (
          <div className={cn("mt-3 flex flex-col gap-1.5", ENTER)} style={step()}>
            {data.overnightMail.rows.map((m) => (
              <MailLine key={m.key} row={m} />
            ))}
            {data.overnightMail.overflow > 0 && (
              <p className="text-ink-faint text-[0.68rem]">+{data.overnightMail.overflow} altre</p>
            )}
          </div>
        )}

        {showAttention && (
          <section className={cn("mt-8", ENTER)} style={step()}>
            <SectionLabel>Attenzione</SectionLabel>
            <div className="mt-2 flex flex-col gap-1">
              {data.attention.rows.map((r) => (
                <p key={r.key} className="text-sm">
                  <span className="text-ink-soft">{r.label}</span>{" "}
                  <span className="text-primary text-[0.75rem] font-medium">{r.detail}</span>
                </p>
              ))}
            </div>
          </section>
        )}

        <section className={cn("mt-8", ENTER)} style={step()}>
          <SectionLabel>Oggi</SectionLabel>
          {data.today.rows.length === 0 && data.today.allDayCount === 0 ? (
            <p className="text-ink-soft mt-2 text-sm">Nessun impegno in programma.</p>
          ) : (
            <div className="mt-2 flex flex-col gap-1">
              {data.today.rows.map((e) => (
                <p key={e.key} className="flex items-baseline gap-3 text-sm">
                  <span className="text-ink-faint w-11 shrink-0 font-mono text-[0.7rem] tabular-nums">
                    {e.time}
                  </span>
                  <span className="text-ink-soft">{e.title}</span>
                </p>
              ))}
              {data.today.overflow > 0 && (
                <p className="text-ink-faint pl-14 text-[0.68rem]">+{data.today.overflow} altri</p>
              )}
              {data.today.allDayCount > 0 && (
                <p className="text-ink-faint pl-14 text-[0.68rem]">
                  + {data.today.allDayCount} {data.today.allDayCount === 1 ? "evento" : "eventi"} per tutto il
                  giorno
                </p>
              )}
            </div>
          )}
        </section>

        <div className={cn("mt-12 flex flex-col items-start gap-2.5", ENTER)} style={step()}>
          <p className="font-heading text-foreground text-lg">La giornata è pronta.</p>
          <button
            type="button"
            onClick={onEnter}
            className="text-primary hover:bg-brand-soft active:translate-y-px -mx-2 rounded-md px-2 py-1.5 text-sm font-semibold transition-colors duration-100"
          >
            Entra nella giornata →
          </button>
        </div>
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-ink-faint text-[0.62rem] font-semibold tracking-[0.08em] uppercase">{children}</p>
  )
}

/** Riga mail dell'anteprima "Mentre dormivi" — sola lettura, niente icona
 * per-provider/link cliccabile qui (il briefing orienta, non gestisce: si
 * agisce dopo, nel pannello destro/nel blocco Mail, dove queste stesse
 * righe restano azionabili — vedi lib/attention-signals.ts). */
function MailLine({ row }: { row: MorningBriefingMailRow }) {
  return (
    <p className="flex items-baseline gap-2 text-sm">
      {row.unread && <span aria-hidden title="Non letta" className="bg-primary size-1.5 shrink-0 rounded-full" />}
      <span className={cn("text-ink-soft min-w-0 truncate", row.unread && "font-semibold")}>{row.subject}</span>
      <span className="text-ink-faint shrink-0 text-[0.75rem]">{row.from}</span>
      {row.time && <span className="text-ink-faint ml-auto shrink-0 font-mono text-[0.68rem]">{row.time}</span>}
    </p>
  )
}
