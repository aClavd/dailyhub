"use client"

import { useState } from "react"

import { DialogClose, DialogPopup, DialogTitle } from "@/components/ui/dialog"
import { addMailFilter, removeMailFilter } from "@/lib/actions/mail-filters"
import type { MailFilterSummary } from "@/lib/queries/mail-filters"

/**
 * Elenco delle regole "mail importante" — aggiungi/rimuovi, un testo per
 * regola confrontato con mittente E oggetto (mail-notifier.tsx). Stesso
 * schema di layout-manager.tsx (Fase 5.4): contenuto di un Dialog (aperto
 * dall'icona filtro in mail-card.tsx). A differenza di layout-manager.tsx,
 * `filters` arriva già pronto da MailLive (letto una volta da page.tsx,
 * insieme alla posta) invece di ricaricarlo qui al mount: DEVE essere
 * disponibile fin dal primo render della board, non solo quando si apre
 * questo dialog — altrimenti MailNotifier non avrebbe niente da
 * controllare finché non lo apri almeno una volta.
 */
export function MailFilterDialog({
  filters,
  onChange,
}: {
  filters: MailFilterSummary[]
  onChange: (filters: MailFilterSummary[]) => void
}) {
  const [newPattern, setNewPattern] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function submitAdd() {
    if (newPattern.trim() === "") return
    const result = await addMailFilter(newPattern)
    if (!result.ok) {
      setError(result.reason === "duplicate" ? "Regola già presente." : "Testo non valido.")
      return
    }
    onChange([...filters, result.filter])
    setNewPattern("")
    setError(null)
  }

  async function handleRemove(id: string) {
    const result = await removeMailFilter(id)
    if (!result.ok) return
    onChange(filters.filter((f) => f.id !== id))
  }

  return (
    <DialogPopup>
      <div className="border-border flex shrink-0 items-center justify-between border-b px-5 py-3.5">
        <DialogTitle>Mail importanti</DialogTitle>
        <DialogClose
          aria-label="Chiudi"
          className="relative text-ink-faint hover:bg-muted hover:text-foreground grid size-7 shrink-0 place-items-center rounded-md text-base leading-none after:absolute after:-inset-2 after:content-['']"
        >
          &times;
        </DialogClose>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <p className="text-ink-faint mb-3 text-xs">
          Un avviso ogni volta che arriva una mail il cui mittente o oggetto
          contiene uno di questi testi (maiuscole/minuscole non contano).
        </p>

        {filters.length === 0 ? (
          <p className="text-ink-faint py-6 text-center text-sm">
            Nessuna regola ancora — aggiungine una qui sotto.
          </p>
        ) : (
          <ul className="divide-border divide-y">
            {filters.map((f) => (
              <li key={f.id} className="flex items-center gap-2 py-2.5">
                <span className="min-w-0 flex-1 truncate text-sm">{f.pattern}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(f.id)}
                  aria-label={`Rimuovi ${f.pattern}`}
                  className="text-ink-faint hover:text-destructive shrink-0 text-base leading-none"
                >
                  &times;
                </button>
              </li>
            ))}
          </ul>
        )}

        {error && <p className="text-destructive mt-2 text-xs">{error}</p>}

        <div className="border-border mt-3 flex items-center gap-2 border-t pt-3">
          <input
            value={newPattern}
            onChange={(event) => setNewPattern(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                void submitAdd()
              }
            }}
            placeholder="Es. ryanair, bolletta, nome di una persona…"
            className="bg-muted border-border focus:outline-primary min-w-0 flex-1 rounded-md border px-2.5 py-1.5 text-sm focus:outline-2"
          />
          <button
            type="button"
            onClick={submitAdd}
            className="bg-brand-soft text-primary shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold"
          >
            Aggiungi
          </button>
        </div>
      </div>
    </DialogPopup>
  )
}
