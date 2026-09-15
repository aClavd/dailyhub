"use client"

import { useEffect, useRef } from "react"

/**
 * Richiama `callback` ogni `intervalMs` — usato per tenere Impegni/Mail
 * aggiornati da soli, senza dover ricaricare la pagina (Gmail/Calendar non
 * offrono un modo semplice di "push" per un uso personale come questo, il
 * polling periodico è la via pratica). Salta i giri mentre la scheda del
 * browser non è in primo piano (`document.visibilityState`): non ha senso
 * consumare quota API per aggiornare qualcosa che nessuno sta guardando.
 *
 * `callback` passa per un ref così l'intervallo non va ricreato a ogni
 * render (lo stesso principio già usato altrove in questo progetto per gli
 * effect con `setInterval` — vedi pomodoro-widget.tsx).
 */
export function usePolling(callback: () => void, intervalMs: number) {
  const callbackRef = useRef(callback)
  // Scrivere un ref va fatto fuori dal render (regola react-hooks/refs) —
  // un effect senza dipendenze, che gira dopo ogni render, tiene il ref
  // sempre aggiornato all'ultima `callback` senza dover ricreare
  // l'intervallo sotto a ogni render.
  useEffect(() => {
    callbackRef.current = callback
  })

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") callbackRef.current()
    }, intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
}
