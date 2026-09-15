"use client"

import type { WidgetType } from "@/lib/board"
import { AcquaWidget } from "@/components/widgets/acqua-widget"
import { CalendarWidget } from "@/components/widgets/calendar-widget"
import { LetturaWidget } from "@/components/widgets/lettura-widget"
import { NoteWidget } from "@/components/widgets/note-widget"
import { ObiettiviWidget } from "@/components/widgets/obiettivi-widget"

/**
 * Blocchi di libreria che non sono slot server-side di page.tsx. "diario" e
 * "pomodoro" non passano di qui: la board li tratta come slot server-side
 * (dati dal DB, vedi board.tsx/page.tsx) — pomodoro perché il conteggio
 * sessioni è ora sul JournalEntry del giorno, non più localStorage. "meteo"
 * non è nemmeno un WidgetType: è fisso in testata, non un blocco della board.
 * La maggior parte qui sotto è ancora su localStorage (note/obiettivi/
 * lettura/acqua); "calendario" è diverso — si autoalimenta da Google
 * Calendar (fetchMonthEvents), niente bisogno di uno slot da page.tsx
 * perché non deve girare in sottofondo quando non è sulla board.
 */
export function LibraryWidget({ type }: { type: WidgetType }) {
  switch (type) {
    case "note":
      return <NoteWidget />
    case "obiettivi":
      return <ObiettiviWidget />
    case "lettura":
      return <LetturaWidget />
    case "acqua":
      return <AcquaWidget />
    case "calendario":
      return <CalendarWidget />
    default:
      return null
  }
}
