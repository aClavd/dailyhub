"use client"

import { Bell, Plus, Settings } from "lucide-react"

import { HistoryIcon } from "@/components/board/rail"
import { useBoard } from "@/components/board/board-context"
import { Dialog, DialogTrigger } from "@/components/ui/dialog"
import { DURATIONS } from "@/components/widgets/pomodoro-widget"
import type { DiarioState } from "@/lib/diario"
import type { CalendarResult } from "@/lib/google/calendar"
import type { MailResult } from "@/lib/mail"
import type { MailFilterSummary } from "@/lib/queries/mail-filters"
import type { SpotifyStatus } from "@/lib/queries/spotify"
import { useLiveAttention } from "@/lib/use-attention"
import { cn } from "@/lib/utils"

import { AttentionDialog } from "./attention-dialog"
import { HistoryExplorer } from "./history-explorer"
import { InsightsDialog } from "./insights-dialog"
import { LibraryDialog } from "./library-dialog"

/**
 * Solo il marchio, solo su mobile (su desktop vive nella barra laterale a
 * tutta altezza — vedi rail.tsx). Prima mostrava anche email + "Esci": con
 * l'Account center nel dialog Impostazioni (insights-dialog.tsx, sez. 13-14
 * del documento di rifinitura sidebar) quella riga era ridondante —
 * "Esci" si è spostato lì (lib/actions/auth.ts:logout, stessa Server
 * Action). `lg:hidden` sull'intero header, non solo sul marchio: su
 * desktop non c'è più nulla da mostrare qui, niente riga vuota col bordo.
 *
 * Mobile Navigation & Surfaces v1 — la TopBar diventa il punto d'accesso
 * mobile alle superfici secondarie: quattro icone dirette (Memoria,
 * Attenzione, Libreria, Impostazioni — quest'ultima comprensiva di
 * Progress/Andamento, stesso Dialog con due schede), niente menu "More":
 * il codice richiede solo questi punti d'accesso, un livello di
 * indirezione in più non avrebbe risparmiato niente. Nessuna barra di
 * navigazione permanente in fondo allo schermo.
 *
 * Mobile Attention v1 — Attenzione riusa useLiveAttention (lib/
 * use-attention.ts, la STESSA funzione/lo stesso polling già estratti da
 * right-panel.tsx, non una seconda sorgente): un'unica chiamata qui,
 * mai insieme a quella di RightPanel (mai montati insieme, `lg:` è sempre
 * l'uno o l'altro) — nessun doppio polling in pratica. Il pallino
 * sull'icona usa la STESSA semantica urgente/attenzione già in uso
 * ovunque (AttentionRow/RailIndicator): rosso solo se eventLevel è
 * "urgente", altrimenti il colore normale, mai un badge SaaS con un
 * numero enorme.
 *
 * Ogni trigger è size-11 (44px): non solo i nuovi, anche quello di
 * Memoria (Memory v1.1, prima size-8/32px) — sono la stessa riga di
 * icone, un target più piccolo in mezzo agli altri sarebbe stato
 * incoerente, non solo sotto misura.
 */
export function TopBar({
  todayKey,
  initialEvents,
  initialMail,
  filters,
  diarioInitial,
  googleError,
  spotifyStatus,
  liberoConfigured,
  userEmail,
}: {
  todayKey: string
  initialEvents: CalendarResult
  initialMail: MailResult
  filters: MailFilterSummary[]
  diarioInitial: DiarioState
  /** Per la scheda Account di Impostazioni — stesso `session.error` già
   * passato a RightPanel, non ricalcolato qui. */
  googleError?: string
  spotifyStatus: SpotifyStatus
  liberoConfigured: boolean
  userEmail?: string | null
}) {
  const { habitList, todayDiarioPatch } = useBoard()
  const diario: DiarioState = { ...diarioInitial, ...todayDiarioPatch }

  const { greetingWord, eventLevel, attentionCount, ...signals } = useLiveAttention({
    initialEvents,
    initialMail,
    filters,
    diarioWritten: Boolean(diario.testo.trim()),
  })

  const habitsDone = Object.values(diario.habits).filter(Boolean).length
  const studyMinutes = Math.round(diario.pomodoroSessions * (DURATIONS.focus / 60))

  const triggerClass =
    "border-border bg-card text-ink-soft hover:text-foreground hover:border-ink-faint active:translate-y-px grid size-11 shrink-0 place-items-center rounded-md border transition-colors"

  return (
    <header className="flex items-center justify-between border-b border-border py-3.5 lg:hidden">
      <div className="flex items-center gap-2">
        <span className="bg-primary size-2 rounded-full" />
        <span className="font-heading text-base font-semibold">
          <span className="text-ink-faint font-normal">Daily</span>Hub
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <Dialog>
          <DialogTrigger aria-label="Apri Memoria" title="Memoria — calendario e ricerca" className={triggerClass}>
            <HistoryIcon className="size-4" />
          </DialogTrigger>
          <HistoryExplorer todayKey={todayKey} />
        </Dialog>

        <Dialog>
          <DialogTrigger
            aria-label={attentionCount > 0 ? `Apri Attenzione — ${attentionCount} da guardare` : "Apri Attenzione"}
            title="Attenzione"
            className={cn(triggerClass, "relative")}
          >
            <Bell className="size-4" />
            {attentionCount > 0 && (
              <span
                aria-hidden
                className={cn(
                  "absolute top-2 right-2 size-1.5 rounded-full",
                  eventLevel === "urgente" ? "bg-destructive" : "bg-primary",
                )}
              />
            )}
          </DialogTrigger>
          <AttentionDialog
            {...signals}
            eventLevel={eventLevel}
            attentionCount={attentionCount}
            greetingWord={greetingWord}
            habitsDone={habitsDone}
            studyMinutes={studyMinutes}
            pomodoroSessions={diario.pomodoroSessions}
            habitList={habitList}
          />
        </Dialog>

        <Dialog>
          <DialogTrigger aria-label="Apri Libreria" title="Libreria — aggiungi un blocco" className={triggerClass}>
            <Plus className="size-4" />
          </DialogTrigger>
          <LibraryDialog />
        </Dialog>

        <Dialog>
          <DialogTrigger aria-label="Apri Impostazioni" title="Impostazioni — Andamento e account" className={triggerClass}>
            <Settings className="size-4" />
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
      </div>
    </header>
  )
}
