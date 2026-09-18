"use client"

import { Plus, Settings } from "lucide-react"

import { HistoryIcon } from "@/components/board/rail"
import { useBoard } from "@/components/board/board-context"
import { Dialog, DialogTrigger } from "@/components/ui/dialog"
import type { SpotifyStatus } from "@/lib/queries/spotify"

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
 * mobile alle superfici secondarie: non un menu "More" a sé (il codice
 * ne richiede solo due IN PIÙ oltre a Memoria — Libreria e Impostazioni,
 * quest'ultima già comprensiva di Progress/Andamento, stesso Dialog con
 * due schede — un livello di indirezione in più non avrebbe risparmiato
 * niente), tre icone dirette. Nessuna barra di navigazione permanente in
 * fondo allo schermo, nessuna quinta destinazione: Attention resta
 * deliberatamente fuori da questo giro (Mobile Attention v1, fase
 * successiva) — dove vivrà si decide lì, non aggiungendo qui un'icona
 * che non farebbe ancora niente.
 *
 * Ogni trigger è size-11 (44px): non solo i due nuovi, anche quello di
 * Memoria (Memory v1.1, prima size-8/32px) — sono la stessa riga di
 * icone, un target più piccolo in mezzo agli altri due sarebbe stato
 * incoerente, non solo sotto misura.
 */
export function TopBar({
  todayKey,
  googleError,
  spotifyStatus,
  liberoConfigured,
  userEmail,
}: {
  todayKey: string
  /** Per la scheda Account di Impostazioni — stesso `session.error` già
   * passato a RightPanel, non ricalcolato qui. */
  googleError?: string
  spotifyStatus: SpotifyStatus
  liberoConfigured: boolean
  userEmail?: string | null
}) {
  const { habitList } = useBoard()
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
