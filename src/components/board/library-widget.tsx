"use client"

import type { WidgetType } from "@/lib/board"
import { AcquaWidget } from "@/components/widgets/acqua-widget"
import { LetturaWidget } from "@/components/widgets/lettura-widget"
import { MeteoWidget } from "@/components/widgets/meteo-widget"
import { NoteWidget } from "@/components/widgets/note-widget"
import { ObiettiviWidget } from "@/components/widgets/obiettivi-widget"
import { PomodoroWidget } from "@/components/widgets/pomodoro-widget"

/**
 * Blocchi di libreria "semplici", ancora su localStorage. "diario" non passa
 * di qui: la board lo tratta come slot server-side (dati dal DB) — ora
 * comprende anche abitudini/peso/sonno/umore, non più blocchi a sé.
 */
export function LibraryWidget({ type }: { type: WidgetType }) {
  switch (type) {
    case "pomodoro":
      return <PomodoroWidget />
    case "note":
      return <NoteWidget />
    case "obiettivi":
      return <ObiettiviWidget />
    case "lettura":
      return <LetturaWidget />
    case "acqua":
      return <AcquaWidget />
    case "meteo":
      return <MeteoWidget />
    default:
      return null
  }
}
