"use client"

import { Search, Settings } from "lucide-react"
import type { ReactNode } from "react"
import { useEffect, useRef, useState } from "react"

import { useBoard } from "@/components/board/board-context"
import { WidgetIcon } from "@/components/board/widget-icon"
import { Dialog, DialogTrigger } from "@/components/ui/dialog"
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip"
import { DURATIONS, PHASE_BAR, PHASE_LABELS, PHASE_TEXT } from "@/components/widgets/pomodoro-widget"
import { refreshAgenda } from "@/lib/actions/calendar"
import { refreshMail } from "@/lib/actions/mail"
import { agendaEmphasis, nextOrRunningEvent } from "@/lib/agenda-signal"
import type { WidgetType } from "@/lib/board"
import { greeting, oraBreve, traQuanto } from "@/lib/datetime"
import type { DiarioState } from "@/lib/diario"
import type { CalendarResult } from "@/lib/google/calendar"
import type { MailMessage, MailResult } from "@/lib/mail"
import { matchingFilter } from "@/lib/mail-filter-match"
import type { MailFilterSummary } from "@/lib/queries/mail-filters"
import type { SpotifyStatus } from "@/lib/queries/spotify"
import { usePolling } from "@/lib/use-polling"
import { cn } from "@/lib/utils"

import { CHECK_EVERY_MS as DIARIO_CHECK_MS, REMINDER_HOUR } from "./diario-reminder"
import { HistoryExplorer } from "./history-explorer"
import { InsightsDialog } from "./insights-dialog"
import { NewEventForm } from "./new-event-form"

// Stesso intervallo già usato da Impegni/Mail (agenda-card.tsx/mail-card.tsx)
// — il pannello legge esattamente gli stessi dati, ha senso restare
// sincronizzato alla stessa cadenza, non una terza scelta arbitraria.
const REFRESH_MS = 90_000
const MAX_MAIL_ROWS = 3

// Sez. 9 (Sidebar System Refinement): non più una card per azione (bordo +
// sfondo tenue sempre presenti, "grid di 5 CTA") — righe integrate a piena
// larghezza, nessuno sfondo/bordo a riposo, solo un hover molto sottile.
// Meno "pulsante", più "voce di un menu leggero" — coerente col resto del
// pannello (AttentionRow/MailRow restano card, sono azionabili su qualcosa
// di specifico da gestire; Quick Actions sono scorciatoie, non elementi da
// "risolvere").
const quickActionClass =
  "hover:bg-muted text-ink-soft hover:text-foreground active:translate-y-px flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left text-xs font-medium transition-colors duration-100"

// Motion Language v1, livello STANDARD — deve combaigare con la durata di
// attention-exit in globals.css.
const ATTENTION_EXIT_MS = 200

type Row = { key: string; node: ReactNode }

/**
 * Tiene a schermo, per `exitMs` in più, le righe appena sparite dai dati
 * sorgente (`rows`) — non uno stato/sorgente nuovo: Attenzione resta
 * derivata esattamente come prima (agenda-signal.ts/mail-filter-match.ts),
 * questo hook fa solo da "memoria di scena" per il loro ultimo contenuto
 * reso, il tempo di far girare l'animazione di uscita (attention-exit,
 * globals.css) prima che la riga sparisca per davvero. Popup e Attenzione
 * restano la stessa fonte di verità — qui non cambia quando/se un
 * elemento compare, solo quanto ci mette a togliersi di torno dopo.
 * Nessun FLIP sui vicini che risalgono (deliberato, vedi il piano): uno
 * scatto piccolo quando la riga sparisce per davvero è accettato.
 */
function useExitingRows(rows: Row[], exitMs: number): (Row & { exiting: boolean })[] {
  const [ghosts, setGhosts] = useState<Row[]>([])
  const prevRowsRef = useRef(rows)

  useEffect(() => {
    const prevRows = prevRowsRef.current
    const currentKeys = new Set(rows.map((r) => r.key))
    const justRemoved = prevRows.filter((r) => !currentKeys.has(r.key))
    prevRowsRef.current = rows
    if (justRemoved.length === 0) return
    setGhosts((prev) => [...prev, ...justRemoved])
    // Niente cleanup che cancella questi timer: ognuno riguarda solo la
    // propria chiave, farli scadere tutti per conto proprio anche se
    // l'effect gira di nuovo prima (un'altra riga cambiata nel frattempo)
    // è corretto — cancellarli qui orfanerebbe quei fantasmi per sempre.
    for (const r of justRemoved) {
      window.setTimeout(() => {
        setGhosts((prev) => prev.filter((g) => g.key !== r.key))
      }, exitMs)
    }
  }, [rows, exitMs])

  const currentKeys = new Set(rows.map((r) => r.key))
  return [
    ...rows.map((r) => ({ ...r, exiting: false })),
    ...ghosts.filter((g) => !currentKeys.has(g.key)).map((g) => ({ ...g, exiting: true })),
  ]
}

/**
 * Right Sidebar / Personal Attention Center (Fase B, vedi il piano) —
 * pannello destro, stessa impalcatura del rail sinistro (rail.tsx):
 * `<aside>` sticky a piena altezza, comprimi/espandi persistito
 * (`rightPanelCollapsed`, board-context.tsx — stesso schema di
 * `railCollapsed`). Un solo componente client, non diviso in guscio +
 * sotto-componenti separati, per lo stesso motivo di rail.tsx: il
 * conteggio da mostrare sul pallino della striscia compressa nasce dagli
 * stessi dati "vivi" (eventi/mail) del contenuto espanso, tenerli in due
 * file separati avrebbe richiesto far risalire quello stato comunque qui.
 *
 * Nessun toast nuovo: legge gli stessi segnali che già oggi fanno scattare
 * i popup in toast-context.tsx (agenda-notifier.tsx/mail-notifier.tsx),
 * non ne genera di suoi — vedi lib/agenda-signal.ts e
 * lib/mail-filter-match.ts, estratti apposta per essere la stessa,
 * identica fonte di verità invece di un secondo calcolo.
 */
export function RightPanel({
  initialEvents,
  initialMail,
  filters,
  diarioInitial,
  todayKey,
  googleError,
  spotifyStatus,
  liberoConfigured,
  userEmail,
}: {
  initialEvents: CalendarResult
  initialMail: MailResult
  filters: MailFilterSummary[]
  diarioInitial: DiarioState
  todayKey: string
  /** Per la scheda Account del dialog Impostazioni (insights-dialog.tsx) —
   * stesso `session.error` che già fa comparire "Riconnetti Google" in
   * Impegni/Mail, qui solo esposto anche qui invece di ricalcolato. */
  googleError?: string
  spotifyStatus: SpotifyStatus
  liberoConfigured: boolean
  userEmail?: string | null
}) {
  const {
    rightPanelCollapsed,
    toggleRightPanel,
    hasWidget,
    addWidget,
    habitList,
    todayDiarioPatch,
    pomodoroLive,
  } = useBoard()
  // diarioInitial è letto una volta sola, server-side, al caricamento della
  // pagina — senza questo merge restava fermo lì anche dopo aver scritto e
  // salvato nel blocco Diario (segnalato da Claudio). todayDiarioPatch
  // (board-context.tsx) è aggiornato in tempo reale da diario-widget.tsx/
  // pomodoro-widget.tsx: sovrapposto qui campo per campo, sempre la
  // versione più fresca di ciascun campo.
  const diario: DiarioState = { ...diarioInitial, ...todayDiarioPatch }
  const [events, setEvents] = useState(initialEvents)
  const [mail, setMail] = useState(initialMail)
  const [eventFormOpen, setEventFormOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  usePolling(() => {
    void refreshAgenda().then(setEvents)
  }, REFRESH_MS)
  usePolling(() => {
    void refreshMail().then(setMail)
  }, REFRESH_MS)

  // Promemoria diario: stessa soglia/cadenza di diario-reminder.tsx, ma
  // calcolata SOLO dentro un effect (mai durante il render) — l'ora del
  // server che ha disegnato la pagina e quella di chi la guarda possono
  // differire, calcolarla durante il render rischierebbe un mismatch di
  // idratazione. Parte da `false` (come il primo render server), si
  // aggiorna un istante dopo il mount se è già oltre le 20.
  const [afterReminderHour, setAfterReminderHour] = useState(false)
  useEffect(() => {
    const check = () => setAfterReminderHour(new Date().getHours() >= REMINDER_HOUR)
    check()
    const id = window.setInterval(check, DIARIO_CHECK_MS)
    return () => window.clearInterval(id)
  }, [])

  // Stesso motivo/stessa tecnica di afterReminderHour sopra: il saluto del
  // Daily Brief (greeting(), la stessa funzione già usata dal saluto
  // principale in testata — non un secondo testo inventato) dipende
  // dall'ora, quindi va calcolato solo lato client. `null` finché
  // l'effect non gira una volta — la riga semplicemente non compare per
  // un istante, invece di rischiare un mismatch fra ora del server e ora
  // di chi guarda.
  const [greetingWord, setGreetingWord] = useState<string | null>(null)
  useEffect(() => {
    const set = () => setGreetingWord(greeting())
    set()
  }, [])

  const eventSignal = events.ok ? nextOrRunningEvent(events.events) : null
  const eventLevel = events.ok ? agendaEmphasis(events.events).level : "none"
  const showEvent = Boolean(eventSignal) && eventLevel !== "none"
  const eventTimeLabel = eventSignal
    ? eventSignal.running
      ? "in corso"
      : traQuanto(new Date(eventSignal.event.start as string), new Date())
    : ""

  const importantMail = mail.messages.filter((m) => matchingFilter(m, filters))
  const diarioWritten = Boolean(diario.testo.trim())
  const showDiarioReminder = afterReminderHour && !diarioWritten

  const attentionCount = (showEvent ? 1 : 0) + importantMail.length + (showDiarioReminder ? 1 : 0)

  const habitsDone = Object.values(diario.habits).filter(Boolean).length
  const studyMinutes = Math.round(diario.pomodoroSessions * (DURATIONS.focus / 60))

  // "Non lette", non solo "importanti", quando il dato è disponibile —
  // stato nativo di Gmail (message.unread), non un secondo stato nostro
  // (vedi lib/google/gmail.ts). Libero non lo sa (sempre `unread: false`,
  // non perché sia stata letta per davvero) — se il conteggio "non lette"
  // risulta zero non vuol dire che non ci sia nulla da segnalare, resta
  // la dicitura generica.
  const unreadImportantMail = importantMail.filter((m) => m.unread)
  // Presupposto: importantMail arriva già ordinata più-recente-prima (stesso
  // ordine di lib/mail.ts, mai ri-ordinata qui) — il primo elemento è la
  // mail più recente, per la micro-preview della Attention Rail compressa.
  const latestMail = importantMail[0]

  // Stato del Focus, derivato da pomodoroLive (board-context.tsx, live dal
  // widget Pomodoro montato — Sidebar System Refinement, Step 5):
  // - "idle-unmounted": il blocco non è sulla board, nessuno stato da riflettere.
  // - "idle-mounted": è sulla board ma non c'è una sessione in corso o in pausa.
  // - "paused": fase iniziata e messa in pausa (pausedLeft < durata piena).
  // - "running": conto alla rovescia attivo.
  const focusState: "idle-unmounted" | "idle-mounted" | "paused" | "running" = !pomodoroLive
    ? "idle-unmounted"
    : pomodoroLive.running
      ? "running"
      : pomodoroLive.pausedLeft < DURATIONS[pomodoroLive.phase]
        ? "paused"
        : "idle-mounted"

  // Daily Brief = sintesi, Attenzione = righe azionabili — prima
  // ripetevano quasi le stesse identiche parole (segnalato da Claudio,
  // "piccola duplicazione"): qui sotto solo frasi aggregate, mai un
  // oggetto mail o un titolo impegno per esteso (quelli restano solo
  // nelle righe di Attenzione sotto). L'unica eccezione deliberata è il
  // blocco "Prossimo" — stesso impegno mostrato in entrambe le sezioni,
  // ma con ruolo diverso: qui è la sintesi in evidenza, lì è la riga
  // cliccabile.
  const briefSentences: string[] = []
  if (unreadImportantMail.length > 0) {
    briefSentences.push(
      `Hai ${unreadImportantMail.length} ${unreadImportantMail.length === 1 ? "mail non letta" : "mail non lette"} da gestire.`,
    )
  } else if (importantMail.length > 0) {
    briefSentences.push(
      `Hai ${importantMail.length} ${importantMail.length === 1 ? "mail importante" : "mail importanti"} da gestire.`,
    )
  }
  if (showDiarioReminder) briefSentences.push("Diario ancora da scrivere.")
  if (!showEvent) briefSentences.push("Nessun impegno imminente.")

  // Righe di Attenzione — stessa fonte/stessa logica di sempre (sopra),
  // solo raccolte in un array con identità stabile (key) così
  // useExitingRows (Motion Language v1) può accorgersi di quale riga è
  // appena sparita e farla animare in uscita invece di un taglio secco.
  const attentionRowsSource: Row[] = [
    ...(showEvent && eventSignal
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
      : []),
    ...importantMail.slice(0, MAX_MAIL_ROWS).map((m) => ({
      key: `mail-${m.provider}-${m.id}`,
      node: <MailRow message={m} />,
    })),
    ...(showDiarioReminder
      ? [
          {
            key: `diario-${todayKey}`,
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
      : []),
  ]
  const attentionRows = useExitingRows(attentionRowsSource, ATTENTION_EXIT_MS)

  return (
    <aside
      className={cn(
        // Motion Language v1 — livello STANDARD (200ms): allineata alla
        // durata del contenuto sotto, non più un numero a sé (era 150ms) —
        // la larghezza e il contenuto entrante appartengono alla stessa
        // transizione percepita, non due timer indipendenti.
        "hidden shrink-0 flex-col overflow-hidden border-l border-border bg-card transition-[width] duration-200 motion-reduce:transition-none lg:sticky lg:top-0 lg:flex lg:h-screen",
        // w-10 (40px) bastava per il solo pulsante — un'"Attention Rail"
        // vera con indicatori distinti (non un unico numero) chiede
        // qualche px in più, stesso tipo di aggiustamento già fatto per
        // il rail sinistro in questa sessione.
        // w-72 (288px) → w-80 (320px, pass di calibrazione visiva):
        // dentro il range 300-320px indicato da Claudio, per leggere
        // comodamente oggetto mail/orari/promemoria senza dover
        // troncare tutto.
        rightPanelCollapsed ? "w-12" : "w-80",
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-3.5">
        {!rightPanelCollapsed && <span className="font-heading text-sm font-semibold">Oggi</span>}
        <div className={cn("flex items-center gap-1.5", rightPanelCollapsed && "mx-auto")}>
          {/* Impostazioni (account connessi + Andamento) — solo da
              espansa, stesso criterio dell'ingranaggio "Gestisci layout"
              nel rail sinistro (rail.tsx): da compressa il pannello è già
              dedicato all'Attention Rail, niente spazio per una seconda
              icona di servizio. */}
          {!rightPanelCollapsed && (
            <Dialog>
              <DialogTrigger
                aria-label="Impostazioni"
                title="Impostazioni"
                className="border-border bg-card text-ink-soft hover:text-foreground hover:border-ink-faint active:translate-y-px grid size-6 shrink-0 place-items-center rounded-md border transition-colors duration-100"
              >
                <Settings className="size-3.5" />
              </DialogTrigger>
              <InsightsDialog
                todayKey={todayKey}
                habitList={habitList}
                googleError={googleError}
                spotifyStatus={spotifyStatus}
                liberoConfigured={liberoConfigured}
                userEmail={userEmail}
              />
            </Dialog>
          )}
          <button
            type="button"
            onClick={toggleRightPanel}
            aria-label={rightPanelCollapsed ? "Espandi il pannello" : "Riduci il pannello"}
            aria-expanded={!rightPanelCollapsed}
            className="border-border bg-card text-ink-soft hover:text-foreground hover:border-ink-faint active:translate-y-px grid size-6 shrink-0 place-items-center rounded-md border text-sm transition-colors duration-100"
          >
            {rightPanelCollapsed ? "‹" : "›"}
          </button>
        </div>
      </div>

      {/* Attention Rail — la sidebar compressa non è "nascosta", è un
          livello di densità diverso della STESSA informazione espansa
          sotto (Sidebar System Refinement, sez. 4-6): un'icona semantica
          per tipo invece di un unico pallino, ognuna col proprio stato
          (silenziosa se non c'è nulla di quel tipo, mai un segnaposto
          vuoto) e una micro-preview al hover (sez. 7) che riusa Tooltip
          (components/ui/tooltip.tsx) — nessun secondo sistema di popup,
          la stessa primitiva Base UI già usata per Dialog/Select. Numeri
          solo dove aggiungono informazione reale (conteggio mail, N/tot
          abitudini) — mai un contatore decorativo. Dati identici a quelli
          già calcolati sotto per la vista espansa, nessun segnale nuovo. */}
      {rightPanelCollapsed && (
        // delay-75: il contenuto entrante aspetta un istante dopo che la
        // larghezza ha iniziato a muoversi (Motion Language v1, sez. 2) —
        // per la prima parte del movimento si vede SOLO la larghezza
        // cambiare ("si sta comprimendo"), poi la Attention Rail sfuma
        // dentro ("stessa informazione, più densa") — non le due cose
        // insieme fin dal primo istante, che si percepiva come "un
        // componente sparisce, un altro appare".
        <div className="animate-in fade-in-0 slide-in-from-left-1 motion-reduce:animate-none flex flex-1 flex-col items-center gap-3 overflow-y-auto py-3 duration-200 delay-75">
          {showEvent && eventSignal && (
            <RailIndicator
              label={`Impegno: ${eventSignal.event.title}`}
              preview={
                <>
                  <TooltipLabel>Impegni</TooltipLabel>
                  <p className="mt-0.5 font-medium">{eventSignal.event.title}</p>
                  <p className="text-background/70 mt-0.5">{eventTimeLabel}</p>
                </>
              }
            >
              <span
                aria-hidden
                className={cn(
                  "size-2 rounded-full",
                  eventLevel === "urgente" ? "bg-destructive" : "bg-primary",
                )}
              />
            </RailIndicator>
          )}

          {importantMail.length > 0 && (
            <RailIndicator
              label={`${importantMail.length} mail importanti`}
              preview={
                <>
                  <TooltipLabel>Mail</TooltipLabel>
                  <p className="mt-0.5">
                    {importantMail.length} {importantMail.length === 1 ? "mail importante" : "mail importanti"}
                  </p>
                  {latestMail?.date && (
                    <p className="text-background/70 mt-0.5">Ultima ricevuta {oraBreve(latestMail.date)}</p>
                  )}
                </>
              }
            >
              <span className="text-primary flex items-center gap-0.5">
                <WidgetIcon type="mail" className="size-4" />
                {/* key={valore}: forza React a rimontare questo span
                 * quando il numero cambia (2→3 mail), non a ogni render —
                 * la dissolvenza MICRO riparte solo lì, un piccolo
                 * "battito" quando il conteggio cambia davvero (sez. 4,
                 * "cambio numeri") invece di uno scatto o di girare a ogni
                 * poll anche se il numero è rimasto lo stesso. */}
                <span
                  key={importantMail.length}
                  className="animate-in fade-in-0 duration-100 motion-reduce:animate-none font-mono text-[0.68rem] font-semibold tabular-nums"
                >
                  {importantMail.length}
                </span>
              </span>
            </RailIndicator>
          )}

          {showDiarioReminder && (
            <RailIndicator
              label="Diario di oggi da scrivere"
              preview={
                <>
                  <TooltipLabel>Diario</TooltipLabel>
                  <p className="mt-0.5">Ancora da scrivere oggi</p>
                </>
              }
            >
              <WidgetIcon type="diario" className="text-primary size-4" />
            </RailIndicator>
          )}

          {(showEvent || importantMail.length > 0 || showDiarioReminder) && (
            <span aria-hidden className="border-border w-5 shrink-0 border-t" />
          )}

          <RailIndicator
            label="Focus"
            preview={
              <>
                <TooltipLabel>Focus</TooltipLabel>
                {focusState === "idle-unmounted" && <p className="mt-0.5">Nessuna sessione oggi → Avvia</p>}
                {focusState === "idle-mounted" && (
                  <p className="mt-0.5">
                    {diario.pomodoroSessions === 0
                      ? "Nessuna sessione ancora oggi"
                      : `${diario.pomodoroSessions} ${diario.pomodoroSessions === 1 ? "sessione" : "sessioni"} · ~${studyMinutes} min`}
                  </p>
                )}
                {focusState === "paused" && pomodoroLive && (
                  <p className="mt-0.5">
                    {PHASE_LABELS[pomodoroLive.phase]} in pausa · <StaticClock seconds={pomodoroLive.pausedLeft} />
                  </p>
                )}
                {focusState === "running" && pomodoroLive?.endAt && (
                  <p className="mt-0.5">
                    {PHASE_LABELS[pomodoroLive.phase]} · <FocusClock endAt={pomodoroLive.endAt} />
                  </p>
                )}
              </>
            }
          >
            {/* key={focusState}: stesso "battito" MICRO di sopra quando lo
             * stato del Focus cambia categoria (idle→running→paused),
             * non ad ogni tick del countdown (focusState non cambia ogni
             * secondo, solo su avvio/pausa/completamento). */}
            <WidgetIcon
              key={focusState}
              type="pomodoro"
              className={cn(
                "animate-in fade-in-0 duration-100 motion-reduce:animate-none size-4",
                focusState === "running"
                  ? "text-destructive"
                  : focusState === "paused"
                    ? "text-primary"
                    : focusState === "idle-mounted" && diario.pomodoroSessions > 0
                      ? "text-primary"
                      : "text-ink-faint",
              )}
            />
          </RailIndicator>

          {habitList.length > 0 && (
            <RailIndicator
              label={`${habitsDone} di ${habitList.length} abitudini oggi`}
              preview={
                <>
                  <TooltipLabel>Oggi</TooltipLabel>
                  <p className="mt-0.5">
                    {habitsDone}/{habitList.length} abitudini
                  </p>
                </>
              }
            >
              <span
                key={habitsDone}
                className="animate-in fade-in-0 duration-100 motion-reduce:animate-none text-ink-soft font-mono text-[0.68rem] font-semibold tabular-nums"
              >
                {habitsDone}/{habitList.length}
              </span>
            </RailIndicator>
          )}
        </div>
      )}

      {!rightPanelCollapsed && (
        // Stesso delay-75 di sopra, stessa ragione — coerenza tra le due
        // direzioni (apri/chiudi) e con il rail sinistro (rail.tsx).
        <div className="animate-in fade-in-0 slide-in-from-right-1 motion-reduce:animate-none flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-3 py-4 duration-200 delay-75">
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
                {showEvent && eventSignal && (
                  <div className="border-border mt-2.5 border-t pt-2">
                    <p className="text-ink-faint text-[0.62rem] font-semibold tracking-[0.08em] uppercase">
                      Prossimo
                    </p>
                    <p className="text-ink-soft mt-1 text-sm leading-snug">
                      <span className="font-medium">{eventSignal.event.title}</span> · {eventTimeLabel}
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>

          {attentionRows.length > 0 && (
            <section>
              <SectionLabel>Attenzione</SectionLabel>
              <div className="mt-1.5 flex flex-col gap-1.5">
                {attentionRows.map(({ key, node, exiting }) => (
                  <div
                    key={key}
                    className={cn(
                      // Motion Language v1 — in uscita (risolta/sparita):
                      // dissolvenza + collasso dell'altezza, poi tolta per
                      // davvero (useExitingRows sopra). motion-reduce:
                      // sparisce di scatto invece di restare a mezz'aria
                      // per attention-exit-ms — coerente col resto
                      // ("sidebar width può diventare istantanea").
                      exiting &&
                        "pointer-events-none overflow-hidden [animation:attention-exit_200ms_ease-out_forwards] motion-reduce:hidden",
                    )}
                  >
                    {node}
                  </div>
                ))}
                {importantMail.length > MAX_MAIL_ROWS && (
                  <p className="text-ink-faint px-1 text-[0.68rem]">
                    +{importantMail.length - MAX_MAIL_ROWS} altre mail
                  </p>
                )}
              </div>
            </section>
          )}

          <section>
            <SectionLabel>Azioni rapide</SectionLabel>
            {/* Lista compatta, non più una griglia di 5 grandi CTA (sez. 9):
                stesso set di azioni, integrate come righe leggere —
                sfondo/colore solo al hover, nessun bordo a riposo. */}
            <div className="mt-1">
              <QuickAction
                type="note"
                label="Nuova nota"
                added={hasWidget("note")}
                onClick={() => addWidget("note")}
              />
              <QuickAction
                type="diario"
                label="Scrivi nel diario"
                added={hasWidget("diario")}
                onClick={() => addWidget("diario")}
              />
              <QuickAction
                type="pomodoro"
                label="Pomodoro"
                added={hasWidget("pomodoro")}
                onClick={() => addWidget("pomodoro")}
              />
              <Dialog open={eventFormOpen} onOpenChange={setEventFormOpen}>
                <DialogTrigger className={quickActionClass}>
                  <WidgetIcon type="agenda" className="text-ink-faint size-3.5 shrink-0" />
                  <span className="truncate">Nuovo evento</span>
                </DialogTrigger>
                <NewEventForm
                  open={eventFormOpen}
                  onCreated={() => setEventFormOpen(false)}
                  onClose={() => setEventFormOpen(false)}
                />
              </Dialog>
              <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
                <DialogTrigger className={quickActionClass}>
                  <Search className="text-ink-faint size-3.5 shrink-0" />
                  <span className="truncate">Cerca nella memoria</span>
                </DialogTrigger>
                <HistoryExplorer todayKey={todayKey} />
              </Dialog>
            </div>
          </section>

          {/* Focus riflette lo stato REALE del Pomodoro montato sulla board
              (pomodoroLive, board-context.tsx) — nessun secondo timer: il
              countdown qui sotto (FocusClock) legge lo stesso `endAt` e
              ricalcola per conto proprio, avvia/pausa chiamano le stesse
              identiche funzioni del widget centrale (Sidebar System
              Refinement, Step 5). */}
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
                  {diario.pomodoroSessions === 0
                    ? "Nessuna sessione ancora oggi."
                    : `${diario.pomodoroSessions} ${diario.pomodoroSessions === 1 ? "sessione" : "sessioni"} · ~${studyMinutes} min`}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    // Il blocco è già montato (focusState "idle-mounted"):
                    // avvialo per davvero da qui, stessa funzione del
                    // pulsante Avvia del widget — altrimenti mancava
                    // proprio la board per aggiungerlo (idle-unmounted).
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
            <section className="border-border border-t pt-4">
              <SectionLabel>Oggi</SectionLabel>
              <p className="text-ink-faint mt-1.5 text-[0.72rem]">
                {habitsDone}/{habitList.length} abitudini
              </p>
            </section>
          )}
        </div>
      )}
    </aside>
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-ink-faint text-[0.62rem] font-semibold tracking-[0.08em] uppercase">
      {children}
    </p>
  )
}

function AttentionRow({
  type,
  title,
  time,
  urgent,
  onClick,
}: {
  type: WidgetType
  title: string
  time: string
  urgent: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "border-border bg-card hover:bg-muted relative flex items-center gap-2 overflow-hidden rounded-md border px-2 py-1.5 text-left transition-colors duration-100",
        // Motion Language v1 — STANDARD, entra con una piccola dissolvenza
        // + risalita al montaggio (nuova voce di Attenzione). Gioca una
        // volta sola: la classe non è condizionata da uno stato che
        // cambia più tardi, quindi non riparte ai render successivi.
        // animation-duration-200 (non duration-200): quest'ultima è la
        // stessa variabile di transition-colors qui sopra — usarla anche
        // per l'animazione le farebbe combaciare per forza sulla stessa
        // durata invece di restare due timing indipendenti.
        "animate-in fade-in-0 slide-in-from-top-1 animation-duration-200 motion-reduce:animate-none",
      )}
    >
      {/* Impulso UNA volta sola quando la riga nasce (o diventa) urgente
       * — attention-emphasis, globals.css. Elemento a parte apposta: sta
       * sulla proprietà `animation` della sua stessa origine, non su
       * quella del bottone qui sopra (già occupata dall'entrata) — due
       * animazioni indipendenti, nessuna sovrascrive l'altra. */}
      {urgent && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 [animation:attention-emphasis_300ms_ease-out] motion-reduce:hidden"
        />
      )}
      <WidgetIcon
        type={type}
        className={cn("relative size-3.5 shrink-0", urgent ? "text-destructive" : "text-primary")}
      />
      <span className="relative min-w-0 flex-1 truncate text-xs">{title}</span>
      <span
        className={cn(
          "relative shrink-0 text-[0.65rem] font-medium",
          urgent ? "text-destructive" : "text-ink-faint",
        )}
      >
        {time}
      </span>
    </button>
  )
}

/** Riga mail dell'Attention Center — link vero verso il messaggio quando
 * c'è (Gmail), riga informativa senza azione quando non c'è (Libero non
 * espone un link diretto, vedi lib/mail.ts): mai un'azione finta. */
function MailRow({ message }: { message: MailMessage }) {
  // animation-duration-200 (non duration-200): stessa ragione di
  // AttentionRow — non condividere la variabile con transition-colors qui.
  const rowClass =
    "border-border bg-card flex items-center gap-2 rounded-md border px-2 py-1.5 transition-colors duration-100 animate-in fade-in-0 slide-in-from-top-1 animation-duration-200 motion-reduce:animate-none"
  const content = (
    <>
      <WidgetIcon type="mail" className="text-primary size-3.5 shrink-0" />
      {/* Stesso pallino "non letta" di mail-card.tsx — stato nativo di
          Gmail, non duplicato. */}
      {message.unread && (
        <span aria-hidden title="Non letta" className="bg-primary size-1.5 shrink-0 rounded-full" />
      )}
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-xs",
          message.unread && "font-semibold",
        )}
      >
        {message.subject.trim() || "(senza oggetto)"}
      </span>
      {message.date && (
        <span className="text-ink-faint shrink-0 text-[0.65rem]">{oraBreve(message.date)}</span>
      )}
    </>
  )
  if (message.link) {
    return (
      <a href={message.link} target="_blank" rel="noreferrer" className={cn(rowClass, "hover:bg-muted")}>
        {content}
      </a>
    )
  }
  return <div className={cn(rowClass, "cursor-default")}>{content}</div>
}

function QuickAction({
  type,
  label,
  added,
  onClick,
}: {
  type: WidgetType
  label: string
  added: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={() => {
        if (!added) onClick()
      }}
      aria-disabled={added}
      title={added ? `${label} — già sulla board` : label}
      className={cn(quickActionClass, added && "cursor-default opacity-45 hover:bg-transparent")}
    >
      <WidgetIcon type={type} className="text-ink-faint size-3.5 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  )
}

function formatClock(seconds: number): string {
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0")
  const ss = String(seconds % 60).padStart(2, "0")
  return `${mm}:${ss}`
}

/** Countdown congelato — nessun ticking, per lo stato "in pausa" (il tempo
 * rimasto non scorre finché non si riprende). */
function StaticClock({ seconds }: { seconds: number }) {
  return <span className="font-mono tabular-nums">{formatClock(seconds)}</span>
}

/** Countdown live per la Attention Rail — legge `endAt` (board-context.tsx,
 * cambia solo su avvio/pausa/completamento in pomodoro-widget.tsx) e
 * ricalcola i secondi rimasti con un setInterval TUTTO SUO: un secondo
 * orologio che legge la stessa ora vera del widget centrale, non un
 * secondo timer (Sidebar System Refinement, Step 5 — "NON creare un
 * secondo timer"). Isolato in un componente a parte apposta: il tick di
 * QUESTO span, ogni secondo, non fa ri-renderizzare il resto del pannello
 * (a differenza di aggiornare `pomodoroLive` in board-context ogni tick,
 * che ri-renderizzerebbe tutta l'app — vedi il commento lì). */
function FocusClock({ endAt }: { endAt: number }) {
  const [left, setLeft] = useState(() => Math.max(0, Math.round((endAt - Date.now()) / 1000)))
  useEffect(() => {
    const tick = () => setLeft(Math.max(0, Math.round((endAt - Date.now()) / 1000)))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [endAt])
  return <span className="font-mono tabular-nums">{formatClock(left)}</span>
}

/** Come FocusClock, con numero grande + barra di progresso — solo per la
 * sezione Focus espansa: stesso linguaggio visivo del widget centrale
 * (PHASE_BAR/PHASE_TEXT riusati dal chiamante, non ridefiniti qui). */
function FocusActive({
  endAt,
  totalSec,
  textClass,
  barClass,
}: {
  endAt: number
  totalSec: number
  textClass: string
  barClass: string
}) {
  const [left, setLeft] = useState(() => Math.max(0, Math.round((endAt - Date.now()) / 1000)))
  useEffect(() => {
    const tick = () => setLeft(Math.max(0, Math.round((endAt - Date.now()) / 1000)))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [endAt])
  const progress = totalSec > 0 ? (100 * (totalSec - left)) / totalSec : 0
  return (
    <div className="mt-1.5">
      <p className={cn("font-mono text-2xl font-medium tabular-nums", textClass)}>{formatClock(left)}</p>
      <div className="bg-muted mt-1.5 h-1 overflow-hidden rounded-full">
        <div className={cn("h-full transition-[width]", barClass)} style={{ width: `${progress}%` }} />
      </div>
    </div>
  )
}

/** Un'icona/indicatore della Attention Rail compressa + la sua
 * micro-preview al hover (sez. 7 del documento) — riusa Tooltip
 * (components/ui/tooltip.tsx, avvolge la primitiva Base UI già usata da
 * Dialog/Select) per tutti gli indicatori, non un popover diverso per
 * ciascuno: "se il sistema di tooltip esiste già, riutilizzarlo" — qui è
 * la prima volta che serve, quindi è anche il posto in cui nasce, pronto
 * per essere riusato altrove in futuro. */
function RailIndicator({
  children,
  preview,
  label,
}: {
  children: ReactNode
  preview: ReactNode
  /** Nome accessibile del trigger — la preview è solo al hover/focus, senza
   * un aria-label chi naviga da tastiera o con uno screen reader non
   * saprebbe cosa rappresenta l'icona. */
  label: string
}) {
  return (
    <Tooltip>
      {/* Motion Language v1, livello MICRO — un indicatore che compare
       * (l'evento diventa imminente, arriva mail, ecc.) sfuma dentro in
       * fretta invece di scattare: gioca solo al mount, come le altre
       * entrate di questa sessione. Chi sparisce resta un taglio secco —
       * qui la rail è già compatta, un collasso vero si vedrebbe a
       * malapena e non vale la complessità in più (a differenza della
       * lista Attenzione espansa, dove le righe sono grandi abbastanza
       * da giustificarlo). */}
      <TooltipTrigger
        aria-label={label}
        className="animate-in fade-in-0 duration-100 motion-reduce:animate-none grid shrink-0 place-items-center rounded-md p-0.5"
      >
        {children}
      </TooltipTrigger>
      <TooltipPopup side="left">{preview}</TooltipPopup>
    </Tooltip>
  )
}

function TooltipLabel({ children }: { children: ReactNode }) {
  return <p className="text-background/60 text-[0.6rem] font-semibold tracking-[0.08em] uppercase">{children}</p>
}
