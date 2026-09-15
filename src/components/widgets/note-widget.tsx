"use client"

import { useEffect, useRef, useState } from "react"

import { fetchNote, saveNote } from "@/lib/actions/note"

import { textareaClass } from "./_shared"

const SAVE_DELAY_MS = 600

/** Contenuto del blocco Note — si autoalimenta al mount (niente slot da
 * page.tsx, non deve girare in sottofondo quando non è sulla board, vedi
 * library-widget.tsx), salva con debounce come diario-widget.tsx. `null`
 * mentre carica: distinto da "" (nota vuota per davvero), evita di
 * lampeggiare vuoto un istante prima che arrivi il valore reale. */
export function NoteWidget() {
  const [text, setText] = useState<string | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    void fetchNote().then(setText)
  }, [])

  function handleChange(value: string) {
    setText(value)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => void saveNote(value), SAVE_DELAY_MS)
  }

  return (
    <textarea
      className={textareaClass()}
      rows={5}
      value={text ?? ""}
      onChange={(event) => handleChange(event.target.value)}
      placeholder="Butta giù un pensiero…"
      disabled={text === null}
    />
  )
}
