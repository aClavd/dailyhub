import { chiaveGiorno, dataBreve } from "@/lib/datetime"
import { getDiarioHistory } from "@/lib/queries/diario"

import { HistoryPanelView, type HistoryDayData } from "./history-panel-view"

const DAYS = 7

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

/**
 * Ricapitolo degli ultimi giorni, letto dal DB (Server Component). Prepara
 * dati già "piatti" per il client — niente Date da ricostruire lì.
 */
export async function HistoryPanel() {
  const dates = Array.from({ length: DAYS }, (_, i) => daysAgo(i))
  const keys = dates.map((d) => chiaveGiorno(d))
  const history = await getDiarioHistory(keys)
  const today = chiaveGiorno()

  const days: HistoryDayData[] = dates.map((date, i) => ({
    key: keys[i],
    label: dataBreve(date),
    dayNumber: date.getDate(),
    isToday: keys[i] === today,
    entry: history[keys[i]],
  }))

  return <HistoryPanelView days={days} />
}
