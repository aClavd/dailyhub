"use client"

import { WIDGET_META, type WidgetType } from "@/lib/board"
import { cn } from "@/lib/utils"

import { useBoard } from "./board-context"

export function WidgetShell({
  type,
  fixed = false,
  children,
}: {
  type: WidgetType
  fixed?: boolean
  children: React.ReactNode
}) {
  const { removeWidget } = useBoard()
  const meta = WIDGET_META[type]

  return (
    <section
      className={cn(
        "bg-card ring-foreground/10 flex min-w-0 flex-col rounded-xl ring-1",
        meta.span === 2 && "sm:col-span-2",
      )}
    >
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <h3 className="font-heading text-sm font-medium">{meta.title}</h3>
        {fixed ? (
          <span className="text-[0.6rem] font-medium tracking-wide text-ink-faint uppercase">
            fisso
          </span>
        ) : (
          <button
            type="button"
            onClick={() => removeWidget(type)}
            aria-label={`Rimuovi ${meta.title}`}
            className="text-ink-faint hover:bg-muted hover:text-foreground -mr-1.5 grid size-6 place-items-center rounded-md text-base leading-none transition-colors"
          >
            &times;
          </button>
        )}
      </header>
      <div className="p-4">{children}</div>
    </section>
  )
}
