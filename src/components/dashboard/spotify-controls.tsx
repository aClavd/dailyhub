"use client"

import type { ReactNode } from "react"
import { useFormStatus } from "react-dom"

/** Pulsante di comando dentro un <form action={...}>: si attenua mentre il
 * comando è in volo (useFormStatus legge lo stato del form che lo contiene,
 * per questo deve essere un componente client a parte). */
export function SpotifyControlButton({
  children,
  label,
}: {
  children: ReactNode
  label: string
}) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      aria-label={label}
      disabled={pending}
      className="text-ink-faint hover:text-foreground transition-colors disabled:opacity-40"
    >
      {children}
    </button>
  )
}
