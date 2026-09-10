"use client"

import { useLocalStorage } from "@/lib/use-local-storage"

import { textareaClass } from "./_shared"

export function NoteWidget() {
  const [text, setText] = useLocalStorage<string>("dailyhub:note", "")
  return (
    <textarea
      className={textareaClass()}
      rows={5}
      value={text ?? ""}
      onChange={(event) => setText(event.target.value)}
      placeholder="Butta giù un pensiero…"
    />
  )
}
