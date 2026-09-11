"use client"

import { chiaveGiorno } from "@/lib/datetime"
import { useLocalStorage } from "@/lib/use-local-storage"
import { cn } from "@/lib/utils"

function ieri(): Date {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d
}

/**
 * Log numerico di un valore al giorno (peso, ore di sonno, ...), con il
 * confronto rispetto a ieri. Base condivisa per i blocchi "Peso" e "Sonno".
 */
function MetricWidget({
  storageKeyPrefix,
  unit,
  step,
  placeholder,
}: {
  storageKeyPrefix: string
  unit: string
  step: number
  placeholder: string
}) {
  const [value, setValue] = useLocalStorage<number | null>(
    `${storageKeyPrefix}:${chiaveGiorno()}`,
    null,
  )
  const [previous] = useLocalStorage<number | null>(
    `${storageKeyPrefix}:${chiaveGiorno(ieri())}`,
    null,
  )
  const delta = value != null && previous != null ? value - previous : null

  return (
    <div className="flex h-full flex-col justify-center">
      <div className="flex items-baseline gap-1.5">
        <input
          type="number"
          inputMode="decimal"
          step={step}
          value={value ?? ""}
          onChange={(event) => {
            const raw = event.target.value
            setValue(raw === "" ? null : Number(raw))
          }}
          placeholder={placeholder}
          className="font-mono w-20 border-0 bg-transparent p-0 text-3xl font-medium tabular-nums outline-none placeholder:text-ink-faint"
        />
        <span className="text-ink-faint text-sm">{unit}</span>
      </div>
      <p
        className={cn(
          "mt-1.5 text-[0.7rem]",
          delta == null ? "text-ink-faint" : "text-ink-soft",
        )}
      >
        {delta == null
          ? "Nessun dato ieri"
          : delta === 0
            ? "= come ieri"
            : `${delta > 0 ? "▲" : "▼"} ${Math.abs(delta).toFixed(1)} ${unit} da ieri`}
      </p>
    </div>
  )
}

export function PesoWidget() {
  return (
    <MetricWidget storageKeyPrefix="dailyhub:peso" unit="kg" step={0.1} placeholder="—" />
  )
}

export function SonnoWidget() {
  return (
    <MetricWidget storageKeyPrefix="dailyhub:sonno" unit="h" step={0.5} placeholder="—" />
  )
}
