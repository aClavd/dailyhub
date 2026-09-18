"use client"

import { RailItem } from "@/components/board/rail"
import { useBoard } from "@/components/board/board-context"
import { DialogClose, DialogPopup, DialogTitle } from "@/components/ui/dialog"
import { LIBRARY_WIDGETS } from "@/lib/board"

/**
 * Libreria mobile (Mobile Navigation & Surfaces v1) — non una seconda
 * Libreria: stesso catalogo (LIBRARY_WIDGETS), stessa riga (RailItem,
 * esportata da rail.tsx), stessa funzione addWidget/hasWidget
 * (board-context.tsx) del rail desktop. Solo `collapsed={false}` fisso
 * (qui non c'è uno stato "compresso" da rispettare) e senza il
 * drag-and-drop HTML5 di sfondo — resta attaccato a RailItem (inerte su
 * touch, non è questo il giro per risolverlo: Mobile Interaction v1) ma
 * il tap-to-add, che RailItem ha già, funziona esattamente come sul rail.
 *
 * Il dialog resta aperto dopo un tap (come il rail non si chiude da solo
 * dopo un click) — si può aggiungere più di un blocco in sequenza, si
 * chiude quando l'utente lo decide (× o Escape).
 */
export function LibraryDialog() {
  const { hasWidget, addWidget, mailHasRecent } = useBoard()

  return (
    <DialogPopup>
      <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3.5">
        <div>
          <DialogTitle>Libreria</DialogTitle>
          <p className="text-ink-faint mt-0.5 text-[0.68rem]">Tocca un blocco per aggiungerlo alla board.</p>
        </div>
        <DialogClose
          aria-label="Chiudi"
          className="relative text-ink-faint hover:bg-muted hover:text-foreground grid size-7 shrink-0 place-items-center rounded-md text-base leading-none after:absolute after:-inset-2 after:content-['']"
        >
          &times;
        </DialogClose>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <div className="flex flex-col gap-1.5">
          {LIBRARY_WIDGETS.map((type) => (
            <RailItem
              key={type}
              type={type}
              collapsed={false}
              added={hasWidget(type)}
              onAdd={() => addWidget(type)}
              notice={type === "mail" && mailHasRecent && !hasWidget(type)}
            />
          ))}
        </div>
      </div>
    </DialogPopup>
  )
}
