import { isDiarioEntryEmpty, moodDotClass, type DiarioState } from "@/lib/diario"
import { cn } from "@/lib/utils"

/**
 * Riepilogo di un giorno (umore, obiettivo, diario, abitudini, peso/
 * sonno/pomodori) — spostato qui da history-explorer.tsx (`DayDetail`,
 * privato a quel file) perché ora serve anche a calendar-widget.tsx
 * (Claudio: vuole vedere il diario di un giorno passato anche dal blocco
 * Calendario, non solo dalla Cronologia estesa) — stesso identico
 * contenuto, un solo posto invece di due copie che potrebbero
 * disallinearsi. `entry` `undefined` = non ancora arrivato (i chiamanti
 * lo passano così finché fetchDiarioEntry/fetchDiarioHistory non
 * rispondono, mai un valore inventato nel frattempo).
 */
export function DiarioDaySummary({ entry }: { entry?: DiarioState }) {
  if (!entry) return <p className="text-ink-faint py-6 text-center text-sm">Carico…</p>
  if (isDiarioEntryEmpty(entry)) {
    return <p className="text-ink-faint py-6 text-center text-sm italic">Nessuna voce per questo giorno.</p>
  }
  return (
    <div className="space-y-3">
      {entry.mood && (
        <div className="flex items-center gap-2 text-sm">
          <span className={cn("size-1.5 rounded-full", moodDotClass(entry.mood))} />
          {entry.mood}
        </div>
      )}
      {entry.obiettivo && (
        <div>
          <p className="text-ink-faint text-[0.65rem] uppercase">Obiettivo</p>
          <p className="mt-0.5 text-sm">{entry.obiettivo}</p>
        </div>
      )}
      {entry.testo && (
        <div>
          <p className="text-ink-faint text-[0.65rem] uppercase">Diario</p>
          <p className="mt-0.5 text-sm whitespace-pre-wrap">{entry.testo}</p>
        </div>
      )}
      {Object.keys(entry.habits).length > 0 && (
        <div>
          <p className="text-ink-faint text-[0.65rem] uppercase">Abitudini</p>
          <ul className="mt-1 space-y-1">
            {Object.entries(entry.habits).map(([name, done]) => (
              <li key={name} className="flex items-center gap-2 text-sm">
                <span className={cn("size-1.5 rounded-full", done ? "bg-good" : "bg-border")} />
                {name}
              </li>
            ))}
          </ul>
        </div>
      )}
      {(entry.weight != null || entry.sleepHours != null || entry.pomodoroSessions > 0) && (
        <div className="text-ink-soft flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {entry.weight != null && <span>{entry.weight} kg</span>}
          {entry.sleepHours != null && <span>{entry.sleepHours} h di sonno</span>}
          {entry.pomodoroSessions > 0 && (
            <span>
              {entry.pomodoroSessions} {entry.pomodoroSessions === 1 ? "pomodoro" : "pomodori"}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
