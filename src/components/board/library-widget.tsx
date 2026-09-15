"use client"

import type { WidgetType } from "@/lib/board"
import { CalendarWidget } from "@/components/widgets/calendar-widget"
import { LetturaWidget } from "@/components/widgets/lettura-widget"
import { NoteWidget } from "@/components/widgets/note-widget"

/**
 * Blocchi di libreria che non sono slot server-side di page.tsx. "diario" e
 * "pomodoro" non passano di qui: la board li tratta come slot server-side
 * (dati dal DB, vedi board.tsx/page.tsx) — pomodoro perché il conteggio
 * sessioni è ora sul JournalEntry del giorno, non più localStorage. "meteo"
 * non è nemmeno un WidgetType: è fisso in testata, non un blocco della board.
 * Note/Lettura/Calendario si autoalimentano da sé (una Server Action al
 * mount, non uno slot da page.tsx): non devono girare in sottofondo quando
 * non sono sulla board.
 */
export function LibraryWidget({ type }: { type: WidgetType }) {
  switch (type) {
    case "note":
      return <NoteWidget />
    case "lettura":
      return <LetturaWidget />
    case "calendario":
      return <CalendarWidget />
    default:
      return null
  }
}
