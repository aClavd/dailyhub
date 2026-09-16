"use client"

import { Search } from "lucide-react"
import type { ReactNode } from "react"
import { useEffect, useState } from "react"

import { useBoard } from "@/components/board/board-context"
import { WidgetIcon } from "@/components/board/widget-icon"
import { Dialog, DialogTrigger } from "@/components/ui/dialog"
import { DURATIONS } from "@/components/widgets/pomodoro-widget"
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
import { usePolling } from "@/lib/use-polling"
import { cn } from "@/lib/utils"

import { CHECK_EVERY_MS as DIARIO_CHECK_MS, REMINDER_HOUR } from "./diario-reminder"
import { HistoryExplorer } from "./history-explorer"
import { NewEventForm } from "./new-event-form"

// Stesso intervallo già usato da Impegni/Mail (agenda-card.tsx/mail-card.tsx)
// — il pannello legge esattamente gli stessi dati, ha senso restare
// sincronizzato alla stessa cadenza, non una terza scelta arbitraria.
const REFRESH_MS = 90_000
const MAX_MAIL_ROWS = 3

// Bordo pieno sempre visibile → solo al hover (con uno sfondo tenue al
// suo posto a riposo): il documento di Claudio chiede azioni "leggere",
// coerenti col linguaggio editoriale — non un riquadro utility sempre
// acceso. Testo text-[0.72rem] → text-xs (12px, uno scalino standard di
// Tailwind, non un altro valore arbitrario): contenuto vero da leggere
// (l'etichetta dell'azione), sale di una tacca come il resto del
// contenuto primario del pannello — pass di calibrazione tipografica.
const quickActionClass =
  "border-border/0 hover:border-border bg-muted/40 hover:bg-muted flex items-center gap-1.5 rounded-md border px-2 py-2 text-left text-xs font-medium transition-colors"

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
}: {
  initialEvents: CalendarResult
  initialMail: MailResult
  filters: MailFilterSummary[]
  diarioInitial: DiarioState
  todayKey: string
}) {
  const { rightPanelCollapsed, toggleRightPanel, hasWidget, addWidget, habitList, todayDiarioPatch } =
    useBoard()
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

  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col border-l border-border bg-card transition-[width] duration-150 lg:sticky lg:top-0 lg:flex lg:h-screen",
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
        <button
          type="button"
          onClick={toggleRightPanel}
          aria-label={rightPanelCollapsed ? "Espandi il pannello" : "Riduci il pannello"}
          aria-expanded={!rightPanelCollapsed}
          className={cn(
            "border-border bg-card text-ink-soft hover:text-foreground hover:border-ink-faint grid size-6 shrink-0 place-items-center rounded-md border text-sm transition-colors",
            rightPanelCollapsed && "mx-auto",
          )}
        >
          {rightPanelCollapsed ? "‹" : "›"}
        </button>
      </div>

      {/* "Attention Rail" — da compressa niente più un unico numero sul
          pulsante: indicatori distinti per tipo (attenzione / promemoria /
          focus), silenziosi quando non c'è nulla di quel tipo — mai un
          segnaposto vuoto. Dati identici a quelli già calcolati sotto per
          la vista espansa, nessun segnale nuovo. */}
      {rightPanelCollapsed && (
        <div className="flex flex-1 flex-col items-center gap-3 overflow-y-auto py-3">
          {(showEvent || importantMail.length > 0) && (
            <span
              title={
                showEvent && eventSignal
                  ? `${eventSignal.event.title} ${eventTimeLabel}`
                  : `${importantMail.length} mail da gestire`
              }
              className={cn(
                "size-2 shrink-0 rounded-full",
                eventLevel === "urgente" ? "bg-destructive" : "bg-primary",
              )}
            />
          )}
          {showDiarioReminder && (
            <span title="Diario di oggi — da scrivere" className="shrink-0">
              <WidgetIcon type="diario" className="text-primary size-4" />
            </span>
          )}
          {(showEvent || importantMail.length > 0 || showDiarioReminder) &&
            diario.pomodoroSessions > 0 && (
              <span aria-hidden className="border-border w-5 shrink-0 border-t" />
            )}
          {diario.pomodoroSessions > 0 && (
            <span
              title={`${diario.pomodoroSessions} sessioni Pomodoro oggi`}
              className="text-primary shrink-0 font-mono text-[0.7rem] font-semibold"
            >
              P
            </span>
          )}
        </div>
      )}

      {!rightPanelCollapsed && (
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-3 py-4">
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

          {attentionCount > 0 && (
            <section>
              <SectionLabel>Attenzione</SectionLabel>
              <div className="mt-1.5 flex flex-col gap-1.5">
                {showEvent && eventSignal && (
                  <AttentionRow
                    type="agenda"
                    title={eventSignal.event.title}
                    time={eventTimeLabel}
                    urgent={eventLevel === "urgente"}
                    onClick={() => {
                      if (!hasWidget("agenda")) addWidget("agenda")
                    }}
                  />
                )}
                {importantMail.slice(0, MAX_MAIL_ROWS).map((m) => (
                  <MailRow key={`${m.provider}-${m.id}`} message={m} />
                ))}
                {importantMail.length > MAX_MAIL_ROWS && (
                  <p className="text-ink-faint px-1 text-[0.68rem]">
                    +{importantMail.length - MAX_MAIL_ROWS} altre mail
                  </p>
                )}
                {showDiarioReminder && (
                  <AttentionRow
                    type="diario"
                    title="Diario di oggi"
                    time="da scrivere"
                    urgent={false}
                    onClick={() => {
                      if (!hasWidget("diario")) addWidget("diario")
                    }}
                  />
                )}
              </div>
            </section>
          )}

          <section>
            <SectionLabel>Azioni rapide</SectionLabel>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
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
                  <WidgetIcon type="agenda" className="text-primary size-3.5 shrink-0" />
                  <span className="truncate">Nuovo evento</span>
                </DialogTrigger>
                <NewEventForm
                  open={eventFormOpen}
                  onCreated={() => setEventFormOpen(false)}
                  onClose={() => setEventFormOpen(false)}
                />
              </Dialog>
              <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
                <DialogTrigger className={cn(quickActionClass, "col-span-2")}>
                  <Search className="text-primary size-3.5 shrink-0" />
                  <span className="truncate">Cerca nella memoria</span>
                </DialogTrigger>
                <HistoryExplorer todayKey={todayKey} />
              </Dialog>
            </div>
          </section>

          <section className="border-border border-t pt-4">
            <SectionLabel>Focus</SectionLabel>
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <p className="text-ink-soft min-w-0 flex-1 text-sm">
                {diario.pomodoroSessions === 0
                  ? "Nessuna sessione ancora oggi."
                  : `${diario.pomodoroSessions} ${diario.pomodoroSessions === 1 ? "sessione" : "sessioni"} · ~${studyMinutes} min`}
              </p>
              <button
                type="button"
                onClick={() => {
                  if (!hasWidget("pomodoro")) addWidget("pomodoro")
                }}
                className="text-primary hover:bg-brand-soft shrink-0 rounded-md px-2 py-1 text-[0.68rem] font-semibold"
              >
                {hasWidget("pomodoro") ? "Sulla board" : "Vai"}
              </button>
            </div>
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
      className="border-border bg-card hover:bg-muted flex items-center gap-2 rounded-md border px-2 py-1.5 text-left transition-colors"
    >
      <WidgetIcon
        type={type}
        className={cn("size-3.5 shrink-0", urgent ? "text-destructive" : "text-primary")}
      />
      <span className="min-w-0 flex-1 truncate text-xs">{title}</span>
      <span
        className={cn(
          "shrink-0 text-[0.65rem] font-medium",
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
  const rowClass =
    "border-border bg-card flex items-center gap-2 rounded-md border px-2 py-1.5 transition-colors"
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
      className={cn(quickActionClass, added && "cursor-default opacity-45 hover:border-border/0 hover:bg-muted/40")}
    >
      <WidgetIcon type={type} className="text-primary size-3.5 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  )
}
