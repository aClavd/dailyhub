"use client"

import { cn } from "@/lib/utils"

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-ink-faint mb-1.5 block text-[0.62rem] font-semibold tracking-[0.07em] uppercase first:mt-0 [&:not(:first-child)]:mt-3">
      {children}
    </span>
  )
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly T[]
  value: T | null
  onChange: (value: T) => void
  label: string
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="border-border flex overflow-hidden rounded-lg border"
    >
      {options.map((option, i) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          onClick={() => onChange(option)}
          className={cn(
            "text-ink-soft flex-1 px-1.5 py-1.5 text-[0.72rem] whitespace-nowrap transition-colors",
            i > 0 && "border-border border-l",
            value === option && "bg-brand-soft text-primary font-semibold",
          )}
        >
          {option}
        </button>
      ))}
    </div>
  )
}

export function CheckRow({
  label,
  done,
  onToggle,
  onRemove,
}: {
  label: string
  done: boolean
  onToggle: () => void
  /** Se presente, mostra una × per eliminare la riga (voci personalizzate). */
  onRemove?: () => void
}) {
  return (
    <div className="group border-border flex items-center border-t py-2 first:border-t-0">
      <button
        type="button"
        aria-pressed={done}
        onClick={onToggle}
        className="flex min-w-0 flex-1 items-center gap-2.5 text-left text-[0.82rem]"
      >
        <span
          className={cn(
            "grid size-[15px] shrink-0 place-items-center rounded border text-[10px] transition-colors",
            done
              ? "bg-primary border-primary text-primary-foreground"
              : "border-ink-faint text-transparent",
          )}
        >
          ✓
        </span>
        <span className={cn("truncate", done && "text-ink-faint line-through")}>
          {label}
        </span>
      </button>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Rimuovi ${label}`}
          className="text-ink-faint hover:text-foreground shrink-0 rounded px-1 text-xs opacity-0 transition-opacity group-hover:opacity-100"
        >
          &times;
        </button>
      )}
    </div>
  )
}

export const inputClass =
  "bg-muted border-border focus:outline-primary w-full rounded-lg border px-3 py-2 text-sm focus:outline-2 focus:outline-offset-1"

export function textareaClass(font: "sans" | "heading" = "sans") {
  return cn(
    // resize-none: il ridimensionamento è del blocco intero (maniglie sui
    // bordi della tile), non della singola textarea — altrimenti la presa
    // nativa del browser si confonde con quella della tile.
    "bg-muted border-border focus:outline-primary w-full resize-none rounded-lg border p-3 text-sm leading-relaxed focus:outline-2 focus:outline-offset-1",
    font === "heading" && "font-heading",
  )
}
