"use client"

import { HistoryIcon } from "@/components/board/rail"
import { Dialog, DialogTrigger } from "@/components/ui/dialog"

import { HistoryExplorer } from "./history-explorer"

/**
 * Solo il marchio, solo su mobile (su desktop vive nella barra laterale a
 * tutta altezza — vedi rail.tsx). Prima mostrava anche email + "Esci": con
 * l'Account center nel dialog Impostazioni (insights-dialog.tsx, sez. 13-14
 * del documento di rifinitura sidebar) quella riga era ridondante —
 * "Esci" si è spostato lì (lib/actions/auth.ts:logout, stessa Server
 * Action). `lg:hidden` sull'intero header, non solo sul marchio: su
 * desktop non c'è più nulla da mostrare qui, niente riga vuota col bordo.
 *
 * Memory v1.1: punto d'accesso mobile a Memoria — su desktop il rail
 * sinistro (sempre visibile, mai `lg:hidden`) ha già la sua icona/il suo
 * link "Vedi tutta la memoria"; sotto i 1024px il rail intero è
 * `hidden ... lg:flex`, quindi anche quel trigger sparisce, e con esso
 * l'UNICO modo di apire HistoryExplorer da mobile. Non un secondo
 * HistoryExplorer: stesso identico componente/Dialog di rail.tsx, solo
 * un secondo punto da cui aprirlo — questa era già l'unica testata
 * visibile su mobile, il posto più naturale, non una barra di
 * navigazione nuova. `"use client"` aggiunto qui apposta (prima era un
 * Server Component puro): serve lo stato del `<Dialog>`.
 */
export function TopBar({ todayKey }: { todayKey: string }) {
  return (
    <header className="flex items-center justify-between border-b border-border py-3.5 lg:hidden">
      <div className="flex items-center gap-2">
        <span className="bg-primary size-2 rounded-full" />
        <span className="font-heading text-base font-semibold">
          <span className="text-ink-faint font-normal">Daily</span>Hub
        </span>
      </div>
      <Dialog>
        <DialogTrigger
          aria-label="Apri Memoria"
          title="Memoria — calendario e ricerca"
          className="border-border text-ink-soft hover:text-foreground grid size-8 shrink-0 place-items-center rounded-md border transition-colors"
        >
          <HistoryIcon className="size-4" />
        </DialogTrigger>
        <HistoryExplorer todayKey={todayKey} />
      </Dialog>
    </header>
  )
}
