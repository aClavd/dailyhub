"use client"

import { Search, Settings } from "lucide-react"
import type { ReactNode } from "react"
import { useEffect, useRef, useState } from "react"

import { useBoard } from "@/components/board/board-context"
import { WidgetIcon } from "@/components/board/widget-icon"
import { Dialog, DialogTrigger } from "@/components/ui/dialog"
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip"
import { DURATIONS, PHASE_BAR, PHASE_LABELS, PHASE_TEXT } from "@/components/widgets/pomodoro-widget"
import { buildBriefSentences } from "@/lib/attention-signals"
import type { WidgetType } from "@/lib/board"
import { oraBreve } from "@/lib/datetime"
import type { DiarioState } from "@/lib/diario"
import type { CalendarResult } from "@/lib/google/calendar"
import type { MailMessage, MailResult } from "@/lib/mail"
import type { MailFilterSummary } from "@/lib/queries/mail-filters"
import type { SpotifyStatus } from "@/lib/queries/spotify"
import { useLiveAttention } from "@/lib/use-attention"
import { cn } from "@/lib/utils"

import { HistoryExplorer } from "./history-explorer"
import { InsightsDialog } from "./insights-dialog"
import { NewEventForm } from "./new-event-form"

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

// Right Sidebar 2.0, sez. 13: aprendo la larghezza guida e il contenuto
// segue (già così, vedi delay-75 sotto); chiudendo la sequenza si
// inverte — il contenuto esce PRIMA, la larghezza si stringe solo dopo.
// Stessa durata STANDARD di sopra, nome a parte solo per leggibilità nel
// punto in cui è usata.
const SIDEBAR_CLOSE_MS = 200

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
  const [eventFormOpen, setEventFormOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  // Right Sidebar 2.0, sez. 13 — vero solo per la finestra in cui il
  // contenuto espanso sta uscendo PRIMA che la larghezza si stringa
  // (chiusura, sequenza invertita rispetto all'apertura). toggleRightPanel
  // (e quindi il salvataggio del collapsed su DB) parte solo alla fine di
  // quella finestra, non al click.
  const [closing, setClosing] = useState(false)

  function handleToggleRightPanel() {
    if (rightPanelCollapsed) {
      toggleRightPanel()
      return
    }
    if (closing) return // già in chiusura, click doppio ignorato
    setClosing(true)
    window.setTimeout(() => {
      setClosing(false)
      toggleRightPanel()
    }, SIDEBAR_CLOSE_MS)
  }

  // Eventi/mail live + segnali di Attention + saluto — estratti in
  // lib/use-attention.ts (Mobile Attention v1): stessa identica logica
  // riusata anche da top-bar.tsx per la superficie mobile, non due copie
  // che potrebbero disallinearsi. "Non lette", non solo "importanti",
  // quando il dato è disponibile — stato nativo di Gmail (message.unread),
  // non un secondo stato nostro (vedi lib/google/gmail.ts). Libero non lo
  // sa (sempre `unread: false`, non perché sia stata letta per davvero).
  const {
    showEvent,
    eventSignal,
    eventLevel,
    eventTimeLabel,
    importantMail,
    unreadImportantMail,
    showDiarioReminder,
    attentionCount,
    greetingWord,
  } = useLiveAttention({
    initialEvents,
    initialMail,
    filters,
    diarioWritten: Boolean(diario.testo.trim()),
  })

  const habitsDone = Object.values(diario.habits).filter(Boolean).length
  const studyMinutes = Math.round(diario.pomodoroSessions * (DURATIONS.focus / 60))

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
  const briefSentences = buildBriefSentences({
    showEvent,
    eventSignal,
    eventLevel,
    eventTimeLabel,
    importantMail,
    unreadImportantMail,
    showDiarioReminder,
    attentionCount,
  })

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
        // Responsive Grid Fix 1024-1279px — soglia spostata da lg: (1024)
        // a 2xl: (1536, come rail.tsx — non xl:/1280, misurato insufficiente:
        // vedi top-bar.tsx per i numeri): sotto 1536px non c'è spazio
        // sufficiente perché il board a 6 colonne (minmax(CELL_MIN_REM,
        // ...), mai sotto 8rem/colonna) resti dentro i propri confini tra
        // rail e questo pannello — i blocchi più a destra finivano
        // nascosti oltre lo scroll orizzontale del board. La composizione
        // tablet (TopBar, board a colonne flessibili senza questo minimo)
        // resta quindi attiva fino a 1535px.
        "hidden shrink-0 flex-col overflow-hidden border-l border-border bg-card transition-[width] duration-200 motion-reduce:transition-none 2xl:sticky 2xl:top-0 2xl:flex 2xl:h-screen",
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
            onClick={handleToggleRightPanel}
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

          {showEvent || importantMail.length > 0 || showDiarioReminder ? (
            <span aria-hidden className="border-border w-5 shrink-0 border-t" />
          ) : (
            // Stato zero (Right Sidebar 2.0, sez. 7): non un rail "vuoto e
            // basta" — un piccolo segnale positivo, stesso messaggio già
            // usato dal Daily Brief ("Tutto tranquillo per ora"), stesso
            // colore già usato per le abitudini fatte (text-good) — nessun
            // rosso, nessun numero, nessun elemento che sembri rotto.
            <RailIndicator
              label="Nessuna attenzione richiesta"
              preview={
                <>
                  <TooltipLabel>Attenzione</TooltipLabel>
                  <p className="mt-0.5">Tutto tranquillo per ora</p>
                </>
              }
            >
              <span aria-hidden className="text-good text-sm leading-none">
                ✓
              </span>
            </RailIndicator>
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
            <span className="flex items-center gap-0.5">
              <WidgetIcon
                key={`icon-${focusState}`}
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
              {/* "P 42" — minuti rimasti accanto all'icona, non solo nel
               * tooltip (Right Sidebar 2.0, sez. 5/9): solo quando c'è
               * davvero un conto alla rovescia (attivo o in pausa), mai un
               * numero a riposo. */}
              {(focusState === "running" || focusState === "paused") && pomodoroLive && (
                <span
                  key={`minutes-${focusState}`}
                  className={cn(
                    "animate-in fade-in-0 duration-100 motion-reduce:animate-none font-mono text-[0.68rem] font-semibold tabular-nums",
                    focusState === "running" ? "text-destructive" : "text-primary",
                  )}
                >
                  {focusState === "running" && pomodoroLive.endAt ? (
                    <FocusMinutes endAt={pomodoroLive.endAt} />
                  ) : (
                    Math.max(1, Math.ceil(pomodoroLive.pausedLeft / 60))
                  )}
                </span>
              )}
            </span>
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
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-3 py-4 motion-reduce:animate-none",
            closing
              ? // Chiusura (sez. 13): il contenuto esce PRIMA — la
                // larghezza dell'<aside> resta w-80 per tutta questa
                // finestra (rightPanelCollapsed non è ancora cambiato,
                // vedi handleToggleRightPanel sopra), si stringe solo
                // dopo. animate-out (tw-animate-css), stesso "vocabolario"
                // di animate-in, solo alla rovescia.
                "animate-out fade-out-0 slide-out-to-right-1 duration-200"
              : // Apertura: invariato — delay-75 perché la larghezza ha
                // già iniziato a muoversi (coerenza con rail.tsx).
                "animate-in fade-in-0 slide-in-from-right-1 duration-200 delay-75",
          )}
        >
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

          {/* Non più una sezione a sé con lo stesso peso di Focus (bordo +
              SectionLabel identici) — Right Sidebar 2.0, sez. 11: "Today
              deve comunicare senza competere con Attention/Focus". Una
              riga sola, subito sotto, nessun bordo proprio — il senso
              resta lo stesso (solo abitudini, come prima: sufficiente,
              non riscritto in categorie nuove). */}
          {habitList.length > 0 && (
            <p className="text-ink-faint -mt-2 text-[0.68rem]">
              <span className="font-semibold tracking-[0.04em] uppercase">Oggi</span>{" "}
              {habitsDone}/{habitList.length} abitudini
            </p>
          )}
        </div>
      )}
    </aside>
  )
}

/** Esportata (Mobile Attention v1): stessa etichetta di sezione, riusata
 * dalla superficie Attenzione mobile (attention-dialog.tsx). */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-ink-faint text-[0.62rem] font-semibold tracking-[0.08em] uppercase">
      {children}
    </p>
  )
}

/** Esportata (Mobile Attention v1) — stessa riga, stesso onClick, stessa
 * attention-emphasis: la superficie Attenzione mobile mostra ESATTAMENTE
 * queste righe, non una versione riscritta apposta. */
export function AttentionRow({
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
/** Esportata (Mobile Attention v1) — stesso motivo di AttentionRow sopra. */
export function MailRow({ message }: { message: MailMessage }) {
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
/** Esportata (Mobile Attention v1): stesso Focus, stesso countdown "in
 * pausa" congelato, riusato dalla superficie Attenzione mobile. */
export function StaticClock({ seconds }: { seconds: number }) {
  return <span className="font-mono tabular-nums">{formatClock(seconds)}</span>
}

/** Secondi rimasti, ricalcolati con un setInterval TUTTO SUO a partire da
 * `endAt` (board-context.tsx, cambia solo su avvio/pausa/completamento in
 * pomodoro-widget.tsx) — un secondo orologio che legge la stessa ora vera
 * del widget centrale, non un secondo timer (Sidebar System Refinement,
 * Step 5 — "NON creare un secondo timer"). Estratta una volta sola (prima
 * era duplicata in FocusClock/FocusActive): tre usi diversi (mm:ss in
 * rail, mm:ss grande in sidebar, minuti soli nel badge del rail — Right
 * Sidebar 2.0 sez. 5/9) dalla stessa lettura. */
function useCountdownSeconds(endAt: number): number {
  const [left, setLeft] = useState(() => Math.max(0, Math.round((endAt - Date.now()) / 1000)))
  useEffect(() => {
    const tick = () => setLeft(Math.max(0, Math.round((endAt - Date.now()) / 1000)))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [endAt])
  return left
}

function FocusClock({ endAt }: { endAt: number }) {
  const left = useCountdownSeconds(endAt)
  return <span className="font-mono tabular-nums">{formatClock(left)}</span>
}

/** Minuti soli (arrotondati per eccesso — "ancora un minuto" resta "1",
 * non "0" fino all'ultimo istante), per il badge "P 42" della Attention
 * Rail compressa (Right Sidebar 2.0, sez. 5/9: l'esempio del documento
 * mostra un numero accanto alla lettera, oggi c'era solo l'icona). */
function FocusMinutes({ endAt }: { endAt: number }) {
  const left = useCountdownSeconds(endAt)
  return <>{Math.max(1, Math.ceil(left / 60))}</>
}

/** Come FocusClock, con numero grande + barra di progresso — solo per la
 * sezione Focus espansa: stesso linguaggio visivo del widget centrale
 * (PHASE_BAR/PHASE_TEXT riusati dal chiamante, non ridefiniti qui). */
/** Esportata (Mobile Attention v1) — stesso identico Focus attivo (numero
 * grande + barra), nessun secondo timer: legge lo stesso `endAt` di
 * pomodoroLive (board-context.tsx) del widget centrale. */
export function FocusActive({
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
  const left = useCountdownSeconds(endAt)
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
      {/* min-w/min-h-6 (24px), non solo padding: il contenuto varia da
       * un'icona size-4 a un semplice glifo ✓ o un numero — senza un
       * minimo esplicito il bersaglio cliccabile di alcuni indicatori
       * restava sotto i 24px raccomandati (WCAG 2.5.8) — Right Sidebar
       * 2.0, sez. 16. */}
      <TooltipTrigger
        aria-label={label}
        className="animate-in fade-in-0 duration-100 motion-reduce:animate-none grid min-h-6 min-w-6 shrink-0 place-items-center rounded-md p-1"
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
