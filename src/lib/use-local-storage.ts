"use client"

import { useCallback, useMemo, useSyncExternalStore } from "react"

/**
 * Stato client persistito in localStorage, condiviso fra i componenti che usano
 * la stessa chiave. Base per il layout della board e per i blocchi, finché non
 * arriva il DB (Fase 2 — persistenza server).
 *
 * Usa useSyncExternalStore così SSR e client possono partire da snapshot diversi
 * senza errori di hydration.
 */

type Updater<T> = T | ((prev: T) => T)

type Store<T> = {
  getSnapshot: () => T
  getServerSnapshot: () => T
  subscribe: (fn: () => void) => () => void
  set: (next: Updater<T>) => void
}

const stores = new Map<string, Store<unknown>>()

function makeStore<T>(key: string, fallback: T): Store<T> {
  const listeners = new Set<() => void>()
  let cachedRaw: string | null | undefined
  let cachedValue: T = fallback

  const getSnapshot = (): T => {
    let raw: string | null
    try {
      raw = localStorage.getItem(key)
    } catch {
      return fallback
    }
    if (raw === cachedRaw) return cachedValue
    cachedRaw = raw
    try {
      cachedValue = raw === null ? fallback : (JSON.parse(raw) as T)
    } catch {
      cachedValue = fallback
    }
    return cachedValue
  }

  const set = (next: Updater<T>) => {
    const value =
      typeof next === "function"
        ? (next as (prev: T) => T)(getSnapshot())
        : next
    try {
      const raw = JSON.stringify(value)
      localStorage.setItem(key, raw)
      cachedRaw = raw
      cachedValue = value
    } catch {
      cachedValue = value
      cachedRaw = undefined
    }
    listeners.forEach((fn) => fn())
  }

  const subscribe = (fn: () => void) => {
    listeners.add(fn)
    const onStorage = (event: StorageEvent) => {
      if (event.key === key || event.key === null) {
        cachedRaw = undefined // forza la rilettura al prossimo getSnapshot
        fn()
      }
    }
    window.addEventListener("storage", onStorage)
    return () => {
      listeners.delete(fn)
      window.removeEventListener("storage", onStorage)
    }
  }

  return { getSnapshot, getServerSnapshot: () => fallback, subscribe, set }
}

export function useLocalStorage<T>(key: string, fallback: T) {
  const store = useMemo(() => {
    let existing = stores.get(key) as Store<T> | undefined
    if (!existing) {
      existing = makeStore(key, fallback)
      stores.set(key, existing as Store<unknown>)
    }
    return existing
    // `fallback` volutamente fuori dalle dipendenze: lo store si crea una volta per chiave.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const value = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  )
  const setValue = useCallback((next: Updater<T>) => store.set(next), [store])

  return [value, setValue] as const
}
