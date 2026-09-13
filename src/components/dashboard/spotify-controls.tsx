"use client"

import type { ReactNode } from "react"
import { useFormStatus } from "react-dom"

import { cn } from "@/lib/utils"

/** Pulsante di comando dentro un <form action={...}>: si attenua mentre il
 * comando è in volo (useFormStatus legge lo stato del form che lo contiene,
 * per questo deve essere un componente client a parte). `primary` è il
 * tasto centrale play/pausa, più grande e in evidenza; gli altri due sono
 * "ghost" con un cerchio al passaggio del mouse. */
export function SpotifyControlButton({
  children,
  label,
  primary = false,
}: {
  children: ReactNode
  label: string
  primary?: boolean
}) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      aria-label={label}
      disabled={pending}
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
