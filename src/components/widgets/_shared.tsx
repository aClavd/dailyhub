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
}: {
  label: string
  done: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={done}
      onClick={onToggle}
      className="border-border flex w-full items-center gap-2.5 border-t py-2 text-left text-[0.82rem] first:border-t-0"
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
      <span className={cn(done && "text-ink-faint line-through")}>{label}</span>
    </button>
  )
}

export const inputClass =
  "bg-muted border-border focus:outline-primary w-full rounded-lg border px-3 py-2 text-sm focus:outline-2 focus:outline-offset-1"

export function textareaClass(font: "sans" | "heading" = "sans") {
  return cn(
    "bg-muted border-border focus:outline-primary w-full resize-y rounded-lg border p-3 text-sm leading-relaxed focus:outline-2 focus:outline-offset-1",
    font === "heading" && "font-heading",
  )
}
