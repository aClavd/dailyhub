"use client"

import { useEffect, useRef, useState } from "react"

import { chiaveGiorno } from "@/lib/datetime"
import { useLocalStorage } from "@/lib/use-local-storage"

const FOCUS_SECONDS = 25 * 60

export function PomodoroWidget() {
  const [sessioni, setSessioni] = useLocalStorage<number>(
    `dailyhub:pomodoro:${chiaveGiorno()}`,
    0,
  )
  const [left, setLeft] = useState(FOCUS_SECONDS)
  const [running, setRunning] = useState(false)

  const leftRef = useRef(left)
  useEffect(() => {
    leftRef.current = left
  }, [left])

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      if (leftRef.current <= 1) {
        setRunning(false)
        setLeft(FOCUS_SECONDS)
        setSessioni((n) => (typeof n === "number" ? n + 1 : 1))
      } else {
        setLeft((value) => value - 1)
      }
    }, 1000)
    return () => clearInterval(id)
  }, [running, setSessioni])

  const mm = String(Math.floor(left / 60)).padStart(2, "0")
  const ss = String(left % 60).padStart(2, "0")
  const progress = (100 * (FOCUS_SECONDS - left)) / FOCUS_SECONDS

  return (
    <div>
      <p className="text-center font-mono text-4xl font-medium tabular-nums">
        {mm}:{ss}
      </p>
      <div className="bg-muted mt-2 h-1 overflow-hidden rounded-full">
        <div
          className="bg-primary h-full transition-[width] duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => setRunning((value) => !value)}
          className="bg-brand-soft text-primary flex-1 rounded-md py-1.5 text-xs font-semibold"
        >
          {running ? "Pausa" : "Avvia"}
        </button>
        <button
          type="button"
          onClick={() => {
            setRunning(false)
            setLeft(FOCUS_SECONDS)
          }}
          className="border-border text-ink-soft hover:text-foreground flex-1 rounded-md border py-1.5 text-xs"
        >
          Azzera
        </button>
      </div>
      <p className="text-ink-faint mt-2.5 text-center text-[0.7rem]">
        {sessioni ?? 0} {sessioni === 1 ? "sessione" : "sessioni"} oggi
      </p>
    </div>
  )
}
