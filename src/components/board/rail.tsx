"use client"

import type { ReactNode, SVGProps } from "react"
import { useEffect } from "react"

import { Dialog, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectItem, SelectItemText, SelectPopup, SelectTrigger } from "@/components/ui/select"
import { DND_MIME, WIDGET_META, FIXED_WIDGETS, LIBRARY_WIDGETS, type WidgetType } from "@/lib/board"
import { cn } from "@/lib/utils"

import { useBoard } from "./board-context"
import { LayoutManager } from "./layout-manager"
import { WidgetIcon } from "./widget-icon"

function GearIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  )
}

export function Rail() {
  const {
    hasWidget,
    addWidget,
    railCollapsed,
    toggleRail,
    layoutId,
    layoutName,
    layouts,
    loadLayouts,
    switchLayout,
  } = useBoard()

  // Precaricato appena la barra monta, non solo quando lo switcher si apre:
  // così la tendina ha già l'elenco pronto al primo click, non un vuoto che
  // si riempie un attimo dopo.
  useEffect(() => {
    loadLayouts()
  }, [loadLayouts])

  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col border-r border-border bg-card transition-[width] duration-150 lg:sticky lg:top-0 lg:flex lg:h-screen",
        railCollapsed ? "w-[52px]" : "w-60",
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

      {/* Layout salvati (Fase 5.4) — riga a parte sotto l'intestazione,
          solo a barra espansa: switcher rapido + "gestisci" (rinomina/
          elimina/crea) in un dialog a parte. */}
      {!railCollapsed && (
        <div className="border-border flex shrink-0 items-center gap-1.5 border-b px-3 py-2.5">
          <Select
            value={layoutId}
            onValueChange={(value) => {
              if (typeof value === "string") void switchLayout(value)
            }}
          >
            <SelectTrigger className="min-w-0 flex-1">
              <span className="min-w-0 flex-1 truncate text-left">{layoutName}</span>
            </SelectTrigger>
            <SelectPopup>
              {(layouts ?? []).map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  <SelectItemText>{l.name}</SelectItemText>
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
          <Dialog>
            <DialogTrigger
              aria-label="Gestisci layout"
              title="Gestisci layout"
              className="border-border bg-card text-ink-soft hover:text-foreground hover:border-ink-faint grid size-6 shrink-0 place-items-center rounded-md border transition-colors"
            >
              <GearIcon className="size-3.5" />
            </DialogTrigger>
            <LayoutManager />
          </Dialog>
        </div>
      )}

      {/* Stessa struttura a due gruppi in entrambi gli stati — cambia solo
          come si presenta ogni voce (icona+testo oppure icona sola) e la
          larghezza. Da ridotto niente "space-between": gap costante, e un
          margine in più tra i due gruppi al posto dell'etichetta. */}
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-y-auto py-4",
          railCollapsed ? "gap-4 px-2" : "gap-5 px-2.5",
        )}
      >
        <RailSection label="Sempre attivi" collapsed={railCollapsed}>
          {FIXED_WIDGETS.map((type) => (
            <RailItem key={type} type={type} collapsed={railCollapsed} fixed />
          ))}
        </RailSection>

        <RailSection label="Libreria — trascina o tocca" collapsed={railCollapsed}>
          {LIBRARY_WIDGETS.map((type) => (
            <RailItem
              key={type}
              type={type}
              collapsed={railCollapsed}
              added={hasWidget(type)}
              onAdd={() => addWidget(type)}
            />
          ))}
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
  children: ReactNode
}) {
  return (
    <div>
      {!collapsed && (
        <p className="text-ink-faint mb-2 text-[0.62rem] font-semibold tracking-[0.08em] uppercase">
          {label}
        </p>
      )}
      <div className="flex flex-col items-center gap-1.5">{children}</div>
    </div>
  )
}

function RailItem({
  type,
  collapsed,
  fixed = false,
  added = true,
  onAdd,
}: {
  type: WidgetType
  collapsed: boolean
  fixed?: boolean
  added?: boolean
  onAdd?: () => void
}) {
  const draggable = !fixed && !added
  const meta = WIDGET_META[type]
  const icon = (
    <WidgetIcon
      type={type}
      className={cn("text-primary shrink-0", collapsed ? "size-[18px]" : "size-4")}
    />
  )
  const onDragStart = draggable
    ? (event: React.DragEvent) => {
        event.dataTransfer.setData(DND_MIME, type)
        event.dataTransfer.setData("text/plain", type)
        event.dataTransfer.effectAllowed = "copy"
      }
    : undefined

  if (fixed) {
    return (
      <div
        title={meta.title}
        className={cn(
          "border-border bg-card text-ink-soft flex items-center rounded-lg border",
          collapsed ? "size-9 justify-center" : "w-full gap-2.5 px-2.5 py-2 text-xs",
        )}
      >
        {icon}
        {!collapsed && <span className="truncate">{meta.title}</span>}
      </div>
    )
  }

  return (
    <button
      type="button"
      draggable={draggable}
      onDragStart={onDragStart}
      title={meta.title}
      aria-disabled={added}
      onClick={() => !added && onAdd?.()}
      className={cn(
        "border-border bg-card hover:border-ink-faint hover:bg-muted flex items-center rounded-lg border transition-colors",
        collapsed ? "size-9 justify-center" : "w-full gap-2.5 px-2.5 py-2 text-left",
        added && "cursor-default opacity-45 hover:border-border hover:bg-card",
        !added && "cursor-grab active:cursor-grabbing",
      )}
    >
      {icon}
      {!collapsed && (
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-xs font-medium">{meta.title}</span>
          <span className="text-ink-faint truncate text-[0.65rem]">{meta.desc}</span>
        </span>
      )}
    </button>
  )
}
