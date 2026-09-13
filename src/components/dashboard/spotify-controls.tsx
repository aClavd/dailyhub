"use client"

import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/** Pulsante di comando: click diretto (non più un <form>, vedi
 * spotify-card.tsx) così l'aggiornamento della card usa il valore che
 * torna dalla action stessa, non il refresh automatico di Next dopo un
 * form — quello passa da una richiesta a parte che in dev può fallire per
 * conto suo. `pending` arriva dalla useTransition del genitore. `primary`
 * è il tasto centrale play/pausa, più grande e in evidenza; gli altri due
 * sono "ghost" con un cerchio al passaggio del mouse. */
export function SpotifyControlButton({
  children,
  label,
  primary = false,
  pending = false,
  onClick,
}: {
  children: ReactNode
  label: string
  primary?: boolean
  pending?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={pending}
      onClick={onClick}
      className={cn(
        "flex items-center justify-center rounded-full transition-colors disabled:opacity-40",
        primary
          ? "bg-primary text-primary-foreground hover:bg-primary/90 size-7"
          : "text-ink-faint hover:bg-muted hover:text-foreground size-6",
      )}
    >
      {children}
    </button>
  )
}
