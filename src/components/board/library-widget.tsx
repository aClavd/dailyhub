"use client"

import type { WidgetType } from "@/lib/board"
import { AbitudiniWidget } from "@/components/widgets/abitudini-widget"
import { AcquaWidget } from "@/components/widgets/acqua-widget"
import { LetturaWidget } from "@/components/widgets/lettura-widget"
import { MeteoWidget } from "@/components/widgets/meteo-widget"
import { NoteWidget } from "@/components/widgets/note-widget"
import { ObiettiviWidget } from "@/components/widgets/obiettivi-widget"
import { PesoWidget, SonnoWidget } from "@/components/widgets/metric-widget"
import { PomodoroWidget } from "@/components/widgets/pomodoro-widget"

/**
 * Blocchi di libreria "semplici", ancora su localStorage. "diario" non passa
 * di qui: la board lo tratta come slot server-side (dati dal DB).
 */
export function LibraryWidget({ type }: { type: WidgetType }) {
  switch (type) {
    case "pomodoro":
      return <PomodoroWidget />
    case "abitudini":
      return <AbitudiniWidget />
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
    case "peso":
      return <PesoWidget />
    case "sonno":
      return <SonnoWidget />
    default:
      return null
  }
}
