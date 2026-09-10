"use client"

import { DND_MIME, FIXED_WIDGETS, LIBRARY_WIDGETS, WIDGET_META } from "@/lib/board"
import { cn } from "@/lib/utils"

import { useBoard } from "./board-context"
import { WidgetIcon } from "./widget-icon"

export function Rail() {
  const { hasWidget, addWidget, railCollapsed, toggleRail } = useBoard()

  return (
    <aside
      className={cn(
        "shrink-0 transition-[width] duration-150",
        railCollapsed ? "w-[3.25rem]" : "w-56",
        "sticky top-4 hidden self-start lg:block",
      )}
    >
      <button
        type="button"
        onClick={toggleRail}
        aria-label={railCollapsed ? "Espandi la libreria" : "Riduci la libreria"}
        aria-expanded={!railCollapsed}
        className={cn(
          "border-border bg-card text-ink-soft hover:text-foreground hover:border-ink-faint mb-4 grid size-6 place-items-center rounded-md border text-sm transition-colors",
          railCollapsed ? "mx-auto" : "ml-auto",
        )}
      >
        {railCollapsed ? "›" : "‹"}
      </button>

      <RailSection label="Sempre attivi" collapsed={railCollapsed}>
        {FIXED_WIDGETS.map((type) => (
          <div
            key={type}
            title={WIDGET_META[type].title}
            className={cn(
              "border-border bg-card text-ink-soft flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-xs",
              railCollapsed && "justify-center px-0",
            )}
          >
            <WidgetIcon type={type} className="text-primary size-4 shrink-0" />
            {!railCollapsed && <span className="truncate">{WIDGET_META[type].title}</span>}
          </div>
        ))}
      </RailSection>

      <RailSection
        label="Libreria — trascina o tocca"
        collapsed={railCollapsed}
        className="mt-5"
      >
        {LIBRARY_WIDGETS.map((type) => {
          const added = hasWidget(type)
          return (
            <button
              key={type}
              type="button"
              draggable={!added}
              title={WIDGET_META[type].title}
              aria-disabled={added}
              onClick={() => !added && addWidget(type)}
              onDragStart={(event) => {
                event.dataTransfer.setData(DND_MIME, type)
                event.dataTransfer.setData("text/plain", type)
                event.dataTransfer.effectAllowed = "copy"
              }}
              className={cn(
                "border-border bg-card hover:border-ink-faint hover:bg-muted flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors",
                railCollapsed && "justify-center px-0",
                added && "cursor-default opacity-45 hover:border-border hover:bg-card",
                !added && "cursor-grab active:cursor-grabbing",
              )}
            >
              <WidgetIcon type={type} className="text-primary size-4 shrink-0" />
              {!railCollapsed && (
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-xs font-medium">
                    {WIDGET_META[type].title}
                  </span>
                  <span className="text-ink-faint truncate text-[0.65rem]">
                    {WIDGET_META[type].desc}
                  </span>
                </span>
              )}
            </button>
          )
        })}
      </RailSection>
    </aside>
  )
}

function RailSection({
  label,
  collapsed,
  className,
  children,
}: {
  label: string
  collapsed: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={className}>
      {!collapsed && (
        <p className="text-ink-faint mb-2 text-[0.62rem] font-semibold tracking-[0.08em] uppercase">
          {label}
        </p>
      )}
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  )
}
