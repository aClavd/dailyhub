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
        "hidden shrink-0 flex-col border-r border-border bg-card transition-[width] duration-150 lg:sticky lg:top-0 lg:flex lg:h-screen",
        railCollapsed ? "w-14" : "w-60",
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-3.5">
        {!railCollapsed && (
          <span className="flex min-w-0 items-center gap-2">
            <span className="bg-primary size-2 shrink-0 rounded-full" />
            <span className="font-heading truncate text-sm font-semibold">
              <span className="text-ink-faint font-normal">Daily</span>Hub
            </span>
          </span>
        )}
        <button
          type="button"
          onClick={toggleRail}
          aria-label={railCollapsed ? "Espandi la libreria" : "Riduci la libreria"}
          aria-expanded={!railCollapsed}
          className={cn(
            "border-border bg-card text-ink-soft hover:text-foreground hover:border-ink-faint grid size-6 shrink-0 place-items-center rounded-md border text-sm transition-colors",
            railCollapsed && "mx-auto",
          )}
        >
          {railCollapsed ? "›" : "‹"}
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-3 py-4">
        <RailSection label="Sempre attivi" collapsed={railCollapsed}>
          {FIXED_WIDGETS.map((type) =>
            railCollapsed ? (
              <div
                key={type}
                title={WIDGET_META[type].title}
                className="border-border bg-card mx-auto flex size-9 items-center justify-center rounded-lg border"
              >
                <WidgetIcon type={type} className="text-primary size-[18px]" />
              </div>
            ) : (
              <div
                key={type}
                title={WIDGET_META[type].title}
                className="border-border bg-card text-ink-soft flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-xs"
              >
                <WidgetIcon type={type} className="text-primary size-4 shrink-0" />
                <span className="truncate">{WIDGET_META[type].title}</span>
              </div>
            ),
          )}
        </RailSection>

        <RailSection label="Libreria — trascina o tocca" collapsed={railCollapsed}>
          {LIBRARY_WIDGETS.map((type) => {
            const added = hasWidget(type)
            const onDragStart = (event: React.DragEvent) => {
              event.dataTransfer.setData(DND_MIME, type)
              event.dataTransfer.setData("text/plain", type)
              event.dataTransfer.effectAllowed = "copy"
            }
            const onClick = () => {
              if (!added) addWidget(type)
            }

            if (railCollapsed) {
              return (
                <button
                  key={type}
                  type="button"
                  draggable={!added}
                  title={WIDGET_META[type].title}
                  aria-disabled={added}
                  onClick={onClick}
                  onDragStart={onDragStart}
                  className={cn(
                    "border-border bg-card hover:border-ink-faint hover:bg-muted mx-auto flex size-9 items-center justify-center rounded-lg border transition-colors",
                    added && "cursor-default opacity-45 hover:border-border hover:bg-card",
                    !added && "cursor-grab active:cursor-grabbing",
                  )}
                >
                  <WidgetIcon type={type} className="text-primary size-[18px]" />
                </button>
              )
            }

            return (
              <button
                key={type}
                type="button"
                draggable={!added}
                title={WIDGET_META[type].title}
                aria-disabled={added}
                onClick={onClick}
                onDragStart={onDragStart}
                className={cn(
                  "border-border bg-card hover:border-ink-faint hover:bg-muted flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors",
                  added && "cursor-default opacity-45 hover:border-border hover:bg-card",
                  !added && "cursor-grab active:cursor-grabbing",
                )}
              >
                <WidgetIcon type={type} className="text-primary size-4 shrink-0" />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-xs font-medium">{WIDGET_META[type].title}</span>
                  <span className="text-ink-faint truncate text-[0.65rem]">
                    {WIDGET_META[type].desc}
                  </span>
                </span>
              </button>
            )
          })}
        </RailSection>
      </div>
    </aside>
  )
}

function RailSection({
  label,
  collapsed,
  children,
}: {
  label: string
  collapsed: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      {!collapsed && (
        <p className="text-ink-faint mb-2 text-[0.62rem] font-semibold tracking-[0.08em] uppercase">
          {label}
        </p>
      )}
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  )
}
