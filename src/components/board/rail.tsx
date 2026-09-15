"use client"

import type { ReactNode, SVGProps } from "react"
import { useEffect } from "react"

import { Dialog, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectItem, SelectItemText, SelectPopup, SelectTrigger } from "@/components/ui/select"
import { HistoryExplorer } from "@/components/dashboard/history-explorer"
import { DND_MIME, WIDGET_META, LIBRARY_WIDGETS, type WidgetType } from "@/lib/board"
import type { DiarioState } from "@/lib/diario"
import { daySummary, moodDotClass } from "@/lib/diario"
import { cn } from "@/lib/utils"

import { useBoard } from "./board-context"
import { LayoutManager } from "./layout-manager"
import { WidgetIcon } from "./widget-icon"

export type HistoryDayData = {
  key: string
  /** Es. "mer 10". */
  label: string
  dayNumber: number
  isToday: boolean
  entry?: DiarioState
}

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

function ExpandIcon(props: SVGProps<SVGSVGElement>) {
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
      <path d="M9 3H4v5M15 3h5v5M15 21h5v-5M9 21H4v-5" />
    </svg>
  )
}

export function Rail({
  historyDays,
  todayKey,
}: {
  /** Ultimi 7 giorni, per la sezione Cronologia sotto la Libreria — letti
   * server-side in page.tsx (getDiarioHistory), stesso dato che prima
   * alimentava il pannello a parte sulla destra (history-panel.tsx,
   * eliminato: la Cronologia vive qui adesso). */
  historyDays: HistoryDayData[]
  todayKey: string
}) {
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
    mailHasRecent,
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

      {/* Layout salvati (Fase 5.4) — prima riga a parte visibile solo a
          barra espansa, quindi a barra compressa non c'era alcun modo di
          vedere quale layout fosse attivo né di cambiarlo: segnalato da
          Claudio ("un pallino... per il layout... collegato"). Ora la
          riga resta sempre, cambia solo la forma del trigger: testo per
          esteso da espansa, un pallino con l'iniziale del nome da
          compressa (stesso <Select>, quindi cliccarlo apre la stessa
          tendina e cambia davvero layout — non è un'icona finta). */}
      <div
        className={cn(
          "border-border flex shrink-0 border-b",
          railCollapsed ? "flex-col items-center gap-1.5 px-2 py-2.5" : "items-center gap-1.5 px-3 py-2.5",
        )}
      >
        <Select
          value={layoutId}
          onValueChange={(value) => {
            if (typeof value === "string") void switchLayout(value)
          }}
        >
          <SelectTrigger
            className={
              railCollapsed
                ? "bg-brand-soft text-primary size-7 shrink-0 justify-center rounded-full border-0 p-0 text-[0.68rem] font-semibold"
                : "min-w-0 flex-1"
            }
            showIcon={!railCollapsed}
            aria-label={railCollapsed ? `Layout attivo: ${layoutName} — cambia` : undefined}
            title={railCollapsed ? layoutName : undefined}
          >
            {railCollapsed ? (
              layoutName.trim().charAt(0).toUpperCase() || "•"
            ) : (
              <span className="min-w-0 flex-1 truncate text-left">{layoutName}</span>
            )}
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
        <RailSection label="Libreria — trascina o tocca" collapsed={railCollapsed}>
          {LIBRARY_WIDGETS.map((type) => (
            <RailItem
              key={type}
              type={type}
              collapsed={railCollapsed}
              added={hasWidget(type)}
              onAdd={() => addWidget(type)}
              notice={type === "mail" && mailHasRecent && !hasWidget("mail")}
            />
          ))}
        </RailSection>

        {/* Cronologia — prima un pannello a parte sulla destra
            (history-panel-view.tsx, eliminato), ora qui sotto la Libreria:
            stesso rail, un solo interruttore comprimi/espandi per tutto
            (railCollapsed sopra) invece di due indipendenti. A rail
            compresso resta una versione ridotta (numero del giorno +
            pallino umore, come faceva già il vecchio pannello quando era
            lui a comprimersi) invece di sparire del tutto — segnalato da
            Claudio: senza, a rail compresso non restava alcun segnale che
            la Cronologia esistesse.

            Stesso "min-h-0 flex-1" del contenitore scrollabile qui sopra,
            ma applicato a questo blocco: prima Libreria+Cronologia insieme
            occupavano solo lo spazio del loro contenuto, quindi da chiusa
            (icone e pallini, poco contenuto) restava un vuoto morto sotto
            l'ultimo giorno fino all'avatar in fondo, mentre da aperta
            (testo per esteso) il contenuto sfora ed è più lungo di uno
            schermo — le due viste sembravano scollegate. Ora la Cronologia
            si prende sempre lo spazio che resta sotto la Libreria: da
            aperta non cambia nulla (il contenuto sfora comunque, si scrolla
            come prima), da chiusa i giorni si centrano in quello spazio
            invece di restare incollati in alto con il vuoto sotto. */}
        <div className={cn("flex min-h-0 flex-1 flex-col", railCollapsed && "border-border border-t pt-4")}>
          {/* Icona calendario/ricerca (apre HistoryExplorer) — prima
              spariva insieme all'etichetta a barra compressa, quindi da
              compressa non c'era modo di aprirla: stesso problema del
              layout sopra. Resta sempre, solo l'etichetta di testo è
              solo da espansa. */}
          <div className={cn("mb-2 flex shrink-0 items-center gap-2", railCollapsed ? "justify-center" : "justify-between")}>
            {!railCollapsed && (
              <p className="text-ink-faint text-[0.62rem] font-semibold tracking-[0.08em] uppercase">
                Cronologia — ultimi 7 giorni
              </p>
            )}
            <Dialog>
              <DialogTrigger
                aria-label="Apri calendario e ricerca"
                title="Calendario e ricerca"
                className="text-ink-faint hover:bg-muted hover:text-foreground grid size-6 shrink-0 place-items-center rounded-md transition-colors"
              >
                <ExpandIcon className="size-3.5" />
              </DialogTrigger>
              <HistoryExplorer todayKey={todayKey} />
            </Dialog>
          </div>

          {railCollapsed ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2">
              {historyDays.map((day) => (
                <div
                  key={day.key}
                  title={`${day.label} — ${daySummary(day.entry) || "nessuna voce"}`}
                  className={cn(
                    "flex w-9 flex-col items-center gap-1 rounded-md py-1.5",
                    day.isToday && "bg-brand-soft",
                  )}
                >
                  <span
                    className={cn(
                      "font-mono text-[0.65rem]",
                      day.isToday ? "text-primary font-semibold" : "text-ink-soft",
                    )}
                  >
                    {day.dayNumber}
                  </span>
                  <span className={cn("size-1.5 rounded-full", moodDotClass(day.entry?.mood))} />
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-border flex flex-col divide-y">
              {historyDays.map((day) => {
                const summary = daySummary(day.entry)
                return (
                  <div key={day.key} className="py-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn("size-1.5 shrink-0 rounded-full", moodDotClass(day.entry?.mood))}
                      />
                      <span className="font-mono text-[0.65rem] tracking-wide text-ink-soft uppercase">
                        {day.label}
                      </span>
                      {day.isToday && (
                        <span className="text-primary ml-auto text-[0.58rem] font-semibold tracking-wide uppercase">
                          oggi
                        </span>
                      )}
                    </div>
                    <p
                      className={cn(
                        "mt-1 truncate text-[0.7rem]",
                        summary ? "text-ink-soft" : "text-ink-faint italic",
                      )}
                    >
                      {summary || "Nessuna voce"}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
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
  added = true,
  onAdd,
  notice = false,
}: {
  type: WidgetType
  collapsed: boolean
  added?: boolean
  onAdd?: () => void
  /** Pallino sull'icona — es. è arrivata mail recente mentre il blocco non
   * è sulla board (mailHasRecent, board-context.tsx). */
  notice?: boolean
}) {
  const draggable = !added
  const meta = WIDGET_META[type]
  const { setIsDraggingWidget } = useBoard()
  const icon = (
    <span className="relative shrink-0">
      <WidgetIcon
        type={type}
        className={cn("text-primary", collapsed ? "size-[18px]" : "size-4")}
      />
      {notice && (
        <span
          aria-hidden
          className="bg-primary absolute -top-0.5 -right-0.5 size-1.5 rounded-full"
        />
      )}
    </span>
  )
  const onDragStart = draggable
    ? (event: React.DragEvent) => {
        event.dataTransfer.setData(DND_MIME, type)
        event.dataTransfer.setData("text/plain", type)
        event.dataTransfer.effectAllowed = "copy"
        setIsDraggingWidget(true)
      }
    : undefined
  // dragend scatta sempre, sia che il rilascio sia riuscito sia che sia
  // stato annullato (Escape, rilasciato fuori da qualunque zona valida) —
  // l'evento giusto per spegnere l'indicatore in ogni caso. Va tenuto
  // SEMPRE attaccato, non solo quando `draggable` (bug reale: un drop
  // riuscito fa scattare addWidget, che rende `added` vero e quindi
  // `draggable` falso PRIMA che l'evento nativo dragend arrivi sullo
  // stesso elemento — con l'handler staccato in quel momento, dragend non
  // spegneva più niente e il bordo restava acceso per sempre).
  const onDragEnd = () => setIsDraggingWidget(false)

  return (
    <button
      type="button"
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      title={notice ? `${meta.title} — è arrivato qualcosa di recente` : meta.title}
      aria-disabled={added}
      onClick={() => !added && onAdd?.()}
      className={cn(
        "border-border bg-card hover:border-ink-faint hover:bg-muted flex items-center rounded-lg border transition-colors",
        collapsed ? "size-9 justify-center" : "w-full gap-2.5 px-2.5 py-2 text-left",
        added && "cursor-default opacity-45 hover:border-border hover:bg-card",
        // "pointer", non "grab": si può anche solo cliccare/toccare per
        // aggiungere (onClick sopra) — il trascinamento è un'alternativa,
        // non l'unico modo, più affidabile su trackpad.
        !added && "cursor-pointer active:cursor-grabbing",
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
