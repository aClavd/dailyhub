"use client"

import type { ReactNode, SVGProps } from "react"
import { useEffect } from "react"

import { Dialog, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectItem, SelectItemText, SelectPopup, SelectTrigger } from "@/components/ui/select"
import { HistoryExplorer } from "@/components/dashboard/history-explorer"
import { DND_MIME, WIDGET_META, LIBRARY_WIDGETS, type WidgetType } from "@/lib/board"
import { DIARIO_EMPTY, daySummary, moodDotClass, type DiarioState } from "@/lib/diario"
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

/** Orologio con freccia all'indietro — icona standard per "cronologia".
 * Prima era ExpandIcon (angoli che si allargano, tipico simbolo di
 * "schermo intero"): da compressa restava solo l'icona, senza l'etichetta
 * di testo accanto, e da sola non diceva "cronologia" a nessuno —
 * segnalato da Claudio ("fammi capire che quel quadrato rappresenta la
 * cronologia"). */
/** Esportata (Memory v1.1): stesso segno grafico per "Memoria" ovunque
 * compaia un punto d'accesso — anche in top-bar.tsx (mobile), non
 * un'icona ridisegnata lì apposta. */
export function HistoryIcon(props: SVGProps<SVGSVGElement>) {
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
      <path d="M3 12a9 9 0 1 0 2.6-6.3" />
      <path d="M3 4.5V9h4.5" />
      <path d="M12 7v5l3.5 2" />
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
    todayDiarioPatch,
  } = useBoard()

  // historyDays è letto una volta sola, server-side, al caricamento della
  // pagina — la voce di oggi restava ferma lì anche dopo aver scritto nel
  // Diario (segnalato da Claudio). Solo il giorno di oggi viene
  // sovrapposto con todayDiarioPatch (board-context.tsx, aggiornato in
  // tempo reale da diario-widget.tsx/pomodoro-widget.tsx) — gli altri 6
  // giorni restano quelli letti dal server, invariati.
  const days: HistoryDayData[] = historyDays.map((day) =>
    day.isToday ? { ...day, entry: { ...(day.entry ?? DIARIO_EMPTY), ...todayDiarioPatch } } : day,
  )

  // Precaricato appena la barra monta, non solo quando lo switcher si apre:
  // così la tendina ha già l'elenco pronto al primo click, non un vuoto che
  // si riempie un attimo dopo.
  useEffect(() => {
    loadLayouts()
  }, [loadLayouts])

  return (
    <aside
      className={cn(
        // Motion Language v1, livello STANDARD (200ms) — stessa durata del
        // pannello destro (right-panel.tsx), era 150ms: allineata,
        // "stessa logica per tutte le sidebar".
        "hidden shrink-0 flex-col overflow-hidden border-r border-border bg-card transition-[width] duration-200 motion-reduce:transition-none lg:sticky lg:top-0 lg:flex lg:h-screen",
        // 52px → 64px (Fase successiva): a 52px le icone della Libreria
        // erano già al massimo consentito dalla larghezza (size-9 = 36px,
        // niente margine), sensibilmente più piccole delle righe da
        // espansa — Claudio ha chiesto di avvicinare le due misure. Qui
        // qualche px in più, sotto icone più grandi (size-11).
        railCollapsed ? "w-16" : "w-60",
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
          tendina e cambia davvero layout — non è un'icona finta).
          "Gestisci layout" (rinomina/crea/elimina) invece resta solo da
          espansa — da compressa non ha senso indipendente dal pallino
          (Claudio: "l'ingranaggio... non ha senso, levalo"); basta
          espandere per rinominare o crearne uno nuovo. */}
      <div
        className={cn(
          "border-border flex shrink-0 border-b",
          railCollapsed ? "justify-center px-2 py-2.5" : "items-center gap-1.5 px-3 py-2.5",
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
                ? "bg-brand-soft text-primary size-8 shrink-0 justify-center rounded-full border-0 p-0 text-xs font-semibold"
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
        {!railCollapsed && (
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
        )}
      </div>

      {/* Stessa struttura a due gruppi in entrambi gli stati — cambia solo
          come si presenta ogni voce (icona+testo oppure icona sola) e la
          larghezza. Da ridotto niente "space-between": gap costante, e un
          margine in più tra i due gruppi al posto dell'etichetta. */}
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-y-auto py-4",
          // gap-5 → gap-6 da espansa (Visual Calibration v2, sez. 8): un
          // filo più di separazione tra Libreria e Cronologia, "lista
          // compressa" era il feedback esplicito — da compressa invariato,
          // meno margine per apprezzare la differenza sui pochi px.
          railCollapsed ? "gap-4 px-2" : "gap-6 px-2.5",
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
            invece di restare incollati in alto con il vuoto sotto.

            bg-background (non bg-card, quello del rail stesso): un tono
            leggermente più scuro/grigio crea una zona "incassata"
            riconoscibile a colpo d'occhio, senza inventare un colore
            nuovo — stessa relazione card/background già usata ovunque
            nell'app. Serve a rendere Libreria e Cronologia due mondi
            visivamente distinti (workspace vs memoria), non due sezioni
            identiche impilate una sull'altra. */}
        <div
          className={cn(
            "bg-background flex min-h-0 flex-1 flex-col rounded-lg",
            railCollapsed ? "px-1 pt-3 pb-2" : "px-2 py-3",
          )}
        >
          {/* Un solo <Dialog>, due DialogTrigger (icona in testata + link
              testuale in fondo all'elenco, sotto): stesso dialog aperto da
              due punti diversi, non due istanze — Base UI condivide lo
              stato open tra tutti i Trigger dentro la stessa Root. */}
          <Dialog>
            {/* Icona calendario/ricerca — prima spariva insieme
                all'etichetta a barra compressa, quindi da compressa non
                c'era modo di aprirla: stesso problema del layout sopra.
                Resta sempre, solo l'etichetta di testo è solo da espansa. */}
            <div
              className={cn(
                "mb-2 flex shrink-0 items-center gap-2",
                railCollapsed ? "justify-center" : "justify-between",
              )}
            >
              {/* "Cronologia" → "Memoria" (Memory v1.1, sez. naming): qui è
                  esattamente il punto in cui si parla del concetto ampio
                  ("rivivi le tue giornate"), non solo di un elenco tecnico
                  — stessa parola già usata dai collegamenti da Progress
                  (insights-dialog.tsx). Non rinominato ovunque nel file:
                  i commenti di sviluppo restano "Cronologia" come nota
                  storica, non sono testo mostrato all'utente. */}
              {!railCollapsed && (
                <p className="text-ink-faint text-[0.62rem] font-semibold tracking-[0.08em] uppercase">
                  Memoria — ultimi 7 giorni
                </p>
              )}
              <DialogTrigger
                aria-label="Apri Memoria"
                title="Memoria — calendario e ricerca"
                className="text-ink-faint hover:bg-muted hover:text-foreground grid size-6 shrink-0 place-items-center rounded-md transition-colors"
              >
                <HistoryIcon className="size-3.5" />
              </DialogTrigger>
            </div>

            {railCollapsed ? (
              <div className="animate-in fade-in-0 motion-reduce:animate-none flex flex-1 flex-col items-center justify-center gap-2 duration-200 delay-75">
                {days.map((day) => (
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
              <div className="divide-border animate-in fade-in-0 motion-reduce:animate-none flex flex-col divide-y duration-200 delay-75">
                {days.map((day) => {
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
                          // text-[0.7rem] → text-[0.76rem] (pass di
                          // calibrazione tipografica): è contenuto vero
                          // (cosa è successo quel giorno), non un'etichetta
                          // — merita di leggersi un po' meglio.
                          "mt-1 truncate text-[0.76rem]",
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

            {/* Secondo modo di aprire lo stesso dialog (vedi commento
                sopra) — link testuale esplicito in fondo alla preview,
                come chiesto: l'icona da sola in testata non si leggeva
                come "vedi tutto", solo come un pulsante di servizio. Solo
                da espansa: da compressa non c'è testo da mostrare. */}
            {!railCollapsed && (
              <DialogTrigger className="text-primary hover:underline mt-2 shrink-0 text-left text-[0.68rem] font-medium">
                Vedi tutta la memoria →
              </DialogTrigger>
            )}

            <HistoryExplorer todayKey={todayKey} />
          </Dialog>
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
        <p className="text-ink-faint mb-2.5 text-[0.62rem] font-semibold tracking-[0.08em] uppercase">
          {label}
        </p>
      )}
      <div className={cn("flex flex-col items-center", collapsed ? "gap-2" : "gap-1.5")}>{children}</div>
    </div>
  )
}

/** Esportata (Mobile Navigation & Surfaces v1): stessa identica riga
 * "tocca per aggiungere" usata qui nella Libreria desktop, riusata dalla
 * Libreria mobile (library-dialog.tsx) — un solo catalogo/una sola
 * funzione addWidget, due punti da cui aprirla, non due Librerie. */
export function RailItem({
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
        className={cn("text-primary", collapsed ? "size-5" : "size-4")}
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
        // size-9 (36px) era già al massimo consentito dalla vecchia barra
        // da 52px (niente margine attorno) — con la barra allargata a
        // 64px, size-11 (44px) ci sta comoda e si avvicina di più
        // all'altezza reale di una riga da espansa (icona + titolo +
        // descrizione, ~54px). Vedi commento sopra su <aside>.
        // py-2 → py-1.5 (pass di calibrazione precedente) → py-2 di nuovo
        // (Visual Calibration v2, sez. 8: "ridurre la sensazione di lista
        // compressa" — richiesta esplicita opposta alla precedente, non
        // una contraddizione: il design si ritocca nel tempo).
        collapsed ? "size-11 justify-center" : "w-full gap-2.5 px-2.5 py-2 text-left",
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
