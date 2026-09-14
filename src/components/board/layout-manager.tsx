"use client"

import { useEffect, useState } from "react"

import { DialogClose, DialogPopup, DialogTitle } from "@/components/ui/dialog"

import { useBoard } from "./board-context"

/**
 * Elenco dei layout salvati (Fase 5.4): rinomina sul posto (click sul
 * nome), elimina (mai l'ultimo rimasto), crea un nuovo layout come copia
 * di quello attivo. Contenuto di un Dialog (vedi rail.tsx), aperto
 * dall'icona "gestisci" accanto allo switcher rapido.
 */
export function LayoutManager() {
  const { layouts, loadLayouts, renameLayout, deleteLayout, createLayout, switchLayout } = useBoard()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")
  const [newName, setNewName] = useState("")
  const [error, setError] = useState<string | null>(null)

  // Il Dialog monta questo componente da capo ogni volta che si apre —
  // un solo giro, sempre fresco, niente bisogno di ricaricare a mano.
  useEffect(() => {
    loadLayouts()
  }, [loadLayouts])

  async function submitRename(id: string) {
    if (editingName.trim() === "") {
      setEditingId(null)
      return
    }
    const result = await renameLayout(id, editingName)
    if (!result.ok) {
      setError(result.reason === "duplicate" ? "Nome già usato." : "Nome non valido.")
      return
    }
    setEditingId(null)
    setError(null)
  }

  async function submitCreate() {
    if (newName.trim() === "") return
    const result = await createLayout(newName)
    if (!result.ok) {
      setError(result.reason === "duplicate" ? "Nome già usato." : "Nome non valido.")
      return
    }
    setNewName("")
    setError(null)
    loadLayouts()
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Eliminare il layout "${name}"?`)) return
    const result = await deleteLayout(id)
    if (!result.ok) setError("Non puoi eliminare l'unico layout rimasto.")
  }

  return (
    <DialogPopup>
      <div className="border-border flex shrink-0 items-center justify-between border-b px-5 py-3.5">
        <DialogTitle>Layout salvati</DialogTitle>
        <DialogClose
          aria-label="Chiudi"
          className="text-ink-faint hover:bg-muted hover:text-foreground grid size-7 shrink-0 place-items-center rounded-md text-base leading-none"
        >
          &times;
        </DialogClose>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {layouts === null ? (
          <p className="text-ink-faint py-6 text-center text-sm">Carico…</p>
        ) : (
          <ul className="divide-border divide-y">
            {layouts.map((l) => (
              <li key={l.id} className="flex items-center gap-2 py-2.5">
                {editingId === l.id ? (
                  <input
                    autoFocus
                    value={editingName}
                    onChange={(event) => setEditingName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault()
                        void submitRename(l.id)
                      }
                      if (event.key === "Escape") setEditingId(null)
                    }}
                    onBlur={() => submitRename(l.id)}
                    className="bg-muted border-border focus:outline-primary min-w-0 flex-1 rounded-md border px-2 py-1 text-sm focus:outline-2"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(l.id)
                      setEditingName(l.name)
                      setError(null)
                    }}
                    title="Rinomina"
                    className="min-w-0 flex-1 truncate text-left text-sm hover:underline"
                  >
                    {l.name}
                  </button>
                )}

                {l.isActive ? (
                  <span className="text-primary shrink-0 text-[0.6rem] font-semibold uppercase">
                    attivo
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => switchLayout(l.id)}
                    className="text-ink-faint hover:text-foreground shrink-0 text-[0.68rem]"
                  >
                    attiva
                  </button>
                )}

                {layouts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleDelete(l.id, l.name)}
                    aria-label={`Elimina ${l.name}`}
                    className="text-ink-faint hover:text-destructive shrink-0 text-base leading-none"
                  >
                    &times;
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {error && <p className="text-destructive mt-2 text-xs">{error}</p>}

        <div className="border-border mt-3 flex items-center gap-2 border-t pt-3">
          <input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                void submitCreate()
              }
            }}
            placeholder="Nome nuovo layout…"
            className="bg-muted border-border focus:outline-primary min-w-0 flex-1 rounded-md border px-2.5 py-1.5 text-sm focus:outline-2"
          />
          <button
            type="button"
            onClick={submitCreate}
            className="bg-brand-soft text-primary shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold"
          >
            Crea
          </button>
        </div>
        <p className="text-ink-faint mt-1.5 text-[0.65rem]">Parte come copia del layout attivo.</p>
      </div>
    </DialogPopup>
  )
}
