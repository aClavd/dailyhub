"use client"

import { chiaveGiorno } from "@/lib/datetime"
import { useLocalStorage } from "@/lib/use-local-storage"
import { cn } from "@/lib/utils"

const GLASSES = 8

export function AcquaWidget() {
  const [count, setCount] = useLocalStorage<number>(
    `dailyhub:acqua:${chiaveGiorno()}`,
    0,
  )
  const n = Math.max(0, Math.min(GLASSES, count ?? 0))

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: GLASSES }).map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Bicchiere ${i + 1}`}
            onClick={() => setCount(i + 1 === n ? i : i + 1)}
            className={cn(
              "h-6 w-5 rounded-[3px_3px_5px_5px] border transition-colors",
              i < n ? "bg-libero-bg border-libero-fg" : "border-ink-faint",
            )}
          />
        ))}
      </div>
      <p className="text-ink-faint mt-2 text-[0.7rem]">
        {n} / {GLASSES} bicchieri
      </p>
    </div>
  )
}
