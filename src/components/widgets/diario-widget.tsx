"use client"

import { useCallback, useEffect, useRef, useState, useTransition } from "react"

import { useBoard } from "@/components/board/board-context"
import { fetchDiarioEntry } from "@/lib/actions/history"
import { saveDiarioEntry } from "@/lib/actions/diario"
import { addDays, chiaveGiorno, dataBreve, parseChiave } from "@/lib/datetime"
import { MOODS, type DiarioState, type Mood } from "@/lib/diario"

import { cn } from "@/lib/utils"

import { CheckRow, FieldLabel, Segmented, textareaClass } from "./_shared"

const SAVE_DELAY_MS = 600
// Quanto resta visibile "salvato" prima di sparire da sé — abbastanza per
// essere notato, non così tanto da restare lì a lungo senza motivo.
const SAVED_FLASH_MS = 2000

type SaveStatus = "idle" | "pending" | "saved"

/**
 * Widget "Diario" unificato: un solo record al giorno per journaling,
 * abitudini, peso, sonno e umore — non più 4 blocchi separati. Sezioni
 * impilate con un separatore leggero (border-top), niente card multiple —
 * visivamente resta un unico blocco, ma è scomposto in sotto-componenti
 * (DiaryHeader/JournalSection/HabitSection/QuickStats) qui sotto.
 *
 * `‹`/`›` in testata spostano quale giorno si sta modificando (mai il
 * futuro): utile se un giorno te lo sei perso e vuoi scriverlo dopo.
 * `saveDiarioEntry`/`fetchDiarioEntry` prendono già una data qualsiasi
 * (non "oggi" fisso) — erano già pronte per questo, costruite così fin
 * dalla Cronologia estesa.
 */
export function DiarioWidget({
  initial,
  dayNumber,
  todayKey,
}: {
  initial: DiarioState
  dayNumber: number
  todayKey: string
}) {
  const { patchTodayDiario } = useBoard()
  const [editingDate, setEditingDate] = useState(todayKey)
  const [state, setState] = useState<DiarioState>(initial)
  // Salva in automatico senza chiedere conferma — comodo, ma senza nessun
  // segnale non c'è modo di sapere se un'aggiunta è stata davvero salvata:
  // punto sollevato da Claudio ("finito di compilare... come faccio a
  // salvare?"), soprattutto scrivendo su un giorno passato dove ci si fida
  // meno del "tanto va da sé". Non è un bug (verificato dal vivo: il
  // salvataggio va a buon fine da solo, senza altre azioni) — mancava solo
  // la conferma visibile.
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle")
  const [, startTransition] = useTransition()
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Il salvataggio vero (debounced) — tenuto anche qui, non solo nel
  // timer, per poterlo far scattare subito se si cambia giorno prima che
  // i 600ms passino da soli (altrimenti l'ultima modifica andrebbe persa,
  // mai salvata: bug reale a cui ho pensato scrivendo questo, non trovato
  // dal vivo ma facile da immaginare — scrivi, cambi subito giorno).
  const pendingRun = useRef<(() => void) | null>(null)

  // Segnala in su, verso board-context.tsx, il contenuto di OGGI (mai un
  // giorno passato) mentre lo si scrive — non solo dopo il salvataggio: il
  // pannello destro e la Cronologia nel rail restano fermi allo scatto
  // iniziale della pagina altrimenti (segnalato da Claudio: "ho scritto...
  // salvato... ma la sidebar segna ancora da scrivere"). Stesso schema già
  // approvato in questo progetto per useReportEmphasis (widget-shell.tsx):
  // un setter di un antenato chiamato dentro un effect è un side-effect
  // legittimo verso l'esterno, non uno stato derivato nello stesso
  // componente (quello sì vietato dal linter di questo progetto).
  useEffect(() => {
    if (editingDate !== todayKey) return
    patchTodayDiario({
      testo: state.testo,
      mood: state.mood,
      habits: state.habits,
      weight: state.weight,
      sleepHours: state.sleepHours,
    })
  }, [state, editingDate, todayKey, patchTodayDiario])

  const persist = useCallback((next: DiarioState, date: string, immediate: boolean) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    if (savedFlashTimer.current) clearTimeout(savedFlashTimer.current)
    setSaveStatus("pending")
    const run = () => {
      pendingRun.current = null
      startTransition(() => {
        void saveDiarioEntry(date, next).then(() => {
          setSaveStatus("saved")
          savedFlashTimer.current = setTimeout(() => setSaveStatus("idle"), SAVED_FLASH_MS)
        })
      })
    }
    pendingRun.current = run
    if (immediate) run()
    else saveTimer.current = setTimeout(run, SAVE_DELAY_MS)
  }, [])

  const patch = (part: Partial<DiarioState>, immediate = false) => {
    const next = { ...state, ...part }
    setState(next)
    persist(next, editingDate, immediate)
  }

  function goTo(date: string) {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
      saveTimer.current = null
    }
    pendingRun.current?.() // salva subito quello che c'era in sospeso, sulla data vecchia
    if (savedFlashTimer.current) clearTimeout(savedFlashTimer.current)
    setSaveStatus("idle") // niente "salvato" del giorno vecchio a sventolare su quello nuovo
    setEditingDate(date)
    if (date === todayKey) {
      setState(initial) // già in mano da page.tsx, nessun giro di rete
      return
    }
    startTransition(async () => {
      setState(await fetchDiarioEntry(date))
    })
  }

  const isToday = editingDate === todayKey

  return (
    // Diario Adaptive v1 (proof of concept) — il container query è già
    // dichiarato una volta per tutti i widget in widget-shell.tsx
    // (`@container`, sulla div che avvolge `children`): qui sotto solo
    // regole locali che lo consumano, nessuna modifica al guscio.
    // Soglie scelte dalla geometria reale (CELL_MIN_REM 8 / CELL_MAX_REM
    // 23 / gap 1rem, lib/board.ts), non a caso:
    // - @max-[16rem]: il Diario a minW (1 cella) sta per costruzione tra
    //   8 e 23rem di larghezza — 16rem è circa a metà di quel range,
    //   e coincide con dove il grid auto-fit di QuickStats sotto
    //   collasserebbe comunque a una sola colonna (2×6.5rem+gap≈14rem) —
    //   "compatto" qui significa "già stretto quanto quel meccanismo
    //   indipendente lo percepisce", non un numero indovinato a parte.
    // - @min-[30rem]: oltre la larghezza tipica di w=2 a colonne piene
    //   (2×23+1gap=47rem, ma già da metà quel range c'è respiro reale) —
    //   30rem è dove due colonne di QuickStats hanno già ampio margine e
    //   la textarea può crescere senza sembrare sproporzionata.
    // Tra le due soglie: MEDIUM, il comportamento di oggi, invariato.
    <div className="flex flex-col gap-4 @max-[16rem]:gap-2.5 @min-[30rem]:gap-5">
      <DiaryHeader
        dayNumber={dayNumber}
        editingDate={editingDate}
        isToday={isToday}
        saveStatus={saveStatus}
        onPrev={() => goTo(chiaveGiorno(addDays(parseChiave(editingDate), -1)))}
        onNext={() => goTo(chiaveGiorno(addDays(parseChiave(editingDate), 1)))}
      />

      <JournalSection testo={state.testo} onChange={(testo) => patch({ testo })} />

      <HabitSection
        habits={state.habits}
        onToggle={(name) =>
          patch({ habits: { ...state.habits, [name]: !state.habits[name] } }, true)
        }
      />

      <QuickStats
        isToday={isToday}
        mood={state.mood}
        weight={state.weight}
        sleepHours={state.sleepHours}
        onMood={(mood) => patch({ mood }, true)}
        onWeight={(weight) => patch({ weight })}
        onSleep={(sleepHours) => patch({ sleepHours })}
      />
    </div>
  )
}

function DiaryHeader({
  dayNumber,
  editingDate,
  isToday,
  saveStatus,
  onPrev,
  onNext,
}: {
  dayNumber: number
  editingDate: string
  isToday: boolean
  saveStatus: SaveStatus
  onPrev: () => void
  onNext: () => void
}) {
  // Prima erano "‹"/"›" a size-5 (20px) e text-ink-faint (colore attenuato
  // sempre, anche a riposo) — quasi invisibili, segnalato da Claudio.
  // Stesso stile già usato per avanti/indietro nella Cronologia estesa
  // (history-explorer.tsx, goPrev/goNext): bordo visibile, size-6, colore
  // pieno di default, non solo all'hover.
  const navButton =
    "border-border text-ink-soft hover:text-foreground grid size-6 shrink-0 place-items-center rounded-md border text-sm disabled:opacity-30"
  return (
    <div>
      <div className="flex items-center justify-between gap-1.5">
        <button type="button" onClick={onPrev} aria-label="Giorno precedente" className={navButton}>
          ‹
        </button>
        <span className="text-ink-faint min-w-0 flex-1 truncate text-center font-mono text-[0.68rem] tracking-wide uppercase">
          {isToday ? `Giorno ${dayNumber} · oggi` : dataBreve(parseChiave(editingDate))}
        </span>
        <button
          type="button"
          onClick={onNext}
          disabled={isToday}
          aria-label="Torna a oggi"
          title={isToday ? undefined : "Torna a oggi"}
          className={navButton}
        >
          ›
        </button>
      </div>
      {/* "salvataggio…"/"salvato": prima il salvataggio automatico non dava
          nessun segnale, dava l'impressione di dover fare qualcosa per
          confermare — funzionava già, mancava solo dirlo. Riga a sé sotto
          l'intestazione, non appesa al testo della data: quel testo ha già
          un `truncate` tutto suo, appendere altro lì dentro lo tagliava via
          in silenzio se non c'entrava (bug trovato guardando lo screenshot
          di verifica, non segnalato da Claudio). */}
      {saveStatus !== "idle" && (
        <p
          className={cn(
            "mt-1 text-center font-mono text-[0.6rem] tracking-wide uppercase",
            saveStatus === "saved" ? "text-primary" : "text-ink-faint",
          )}
        >
          {saveStatus === "pending" ? "salvataggio…" : "salvato"}
        </p>
      )}
    </div>
  )
}

function JournalSection({
  testo,
  onChange,
}: {
  testo: string
  onChange: (value: string) => void
}) {
  return (
    <div>
      <FieldLabel>Diario</FieldLabel>
      <textarea
        // LARGE: qualche riga in più di respiro (min-h, non il numero di
        // `rows` — resta un attributo HTML stabile, non qualcosa che
        // varia con la query) — "testo più generoso", nessun font
        // aumentato, nessuna informazione nuova.
        className={cn(textareaClass("heading"), "@min-[30rem]:min-h-36")}
        rows={4}
        value={testo}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Com'è andata oggi…"
      />
    </div>
  )
}

function HabitSection({
  habits,
  onToggle,
}: {
  habits: Record<string, boolean>
  onToggle: (name: string) => void
}) {
  const { habitList, addHabit, removeHabit } = useBoard()
  const [draft, setDraft] = useState("")

  const submit = () => {
    const label = draft.trim()
    if (!label) return
    addHabit(label)
    setDraft("")
  }

  return (
    <div className="border-border border-t pt-4 @max-[16rem]:pt-2.5">
      <FieldLabel>Abitudini</FieldLabel>
      {/* COMPACT: la lista diventa scorrevole invece di spingere in basso
       * tutto il resto — MAI display:none, ogni checkbox resta
       * raggiungibile (scroll, anche da tastiera: il focus nativo del
       * browser scrolla l'elemento a fuoco in vista da solo). Sezione
       * "secondaria, ma in forma più compatta" come richiesto — non
       * declassata a irraggiungibile. */}
      <div className="@max-[16rem]:max-h-32 @max-[16rem]:overflow-y-auto">
        {habitList.length === 0 ? (
          <p className="text-ink-faint text-[0.72rem]">
            Nessuna abitudine ancora — aggiungine una qui sotto.
          </p>
        ) : (
          habitList.map((name) => (
            <CheckRow
              key={name}
              label={name}
              done={Boolean(habits[name])}
              onToggle={() => onToggle(name)}
              onRemove={() => removeHabit(name)}
            />
          ))
        )}
      </div>
      <div className="mt-2 flex gap-1.5 @max-[16rem]:mt-1.5">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              submit()
            }
          }}
          placeholder="Nuova abitudine…"
          className="bg-muted border-border focus:outline-primary min-w-0 flex-1 rounded-md border px-2 py-1 text-xs focus:outline-2"
        />
        <button
          type="button"
          onClick={submit}
          aria-label="Aggiungi abitudine"
          className="border-border text-ink-soft hover:text-foreground shrink-0 rounded-md border px-2 text-sm"
        >
          +
        </button>
      </div>
    </div>
  )
}

function QuickStats({
  isToday,
  mood,
  weight,
  sleepHours,
  onMood,
  onWeight,
  onSleep,
}: {
  isToday: boolean
  mood: Mood | null
  weight: number | null
  sleepHours: number | null
  onMood: (mood: Mood) => void
  onWeight: (value: number | null) => void
  onSleep: (value: number | null) => void
}) {
  return (
    <div className="border-border border-t pt-4 @max-[16rem]:pt-2.5 @min-[30rem]:pt-5">
      {/* Era "Quick stats" — non diceva niente su cosa fosse né che peso/
          sonno si possono lasciare vuoti. Nome letterale + il placeholder
          di MiniStat ("non lo so", sotto) fanno il lavoro insieme: non
          serve una nota a parte per dire "facoltativo". */}
      <FieldLabel>Umore, peso, sonno</FieldLabel>
      <Segmented
        label={isToday ? "Umore di oggi" : "Umore"}
        options={MOODS}
        value={mood}
        onChange={onMood}
      />
      {/* grid-cols-2 fisso rompeva tutto a blocco ristretto (il Diario si
          può ridimensionare fino a 1 cella, ~sotto i 130px): "PESO"/
          "SONNO" affiancate non ci stavano, input e unità si accavallavano
          — segnalato da Claudio ("kg e h... si fukka tutto"). auto-fit +
          minmax: due colonne quando c'è spazio, una sola (a piena
          larghezza, sempre leggibile) quando non ce n'è — nessuna soglia
          a mano da indovinare, si adatta di continuo. Diario Adaptive v1:
          questo meccanismo NON viene toccato/sostituito, solo lo spazio
          attorno (gap/padding) reagisce alla stessa @container. */}
      <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(6.5rem,1fr))] gap-3 @max-[16rem]:mt-2 @max-[16rem]:gap-2 @min-[30rem]:gap-4">
        <MiniStat label="Peso" unit="kg" step={0.1} value={weight} onChange={onWeight} />
        <MiniStat label="Sonno" unit="h" step={0.5} value={sleepHours} onChange={onSleep} />
      </div>
    </div>
  )
}

function MiniStat({
  label,
  unit,
  step,
  value,
  onChange,
}: {
  label: string
  unit: string
  step: number
  value: number | null
  onChange: (value: number | null) => void
}) {
  return (
    <div className="border-border min-w-0 rounded-lg border px-2.5 py-2 @max-[16rem]:px-2 @max-[16rem]:py-1.5 @min-[30rem]:px-3 @min-[30rem]:py-2.5">
      <span className="text-ink-faint block text-[0.62rem] tracking-wide uppercase">
        {label}
      </span>
      <div className="flex items-baseline gap-1">
        <input
          type="number"
          inputMode="decimal"
          step={step}
          min={0}
          value={value ?? ""}
          onChange={(event) => {
            const raw = event.target.value
            if (raw === "") {
              onChange(null)
              return
            }
            const parsed = Number(raw)
            // Peso/sonno negativi non hanno senso — `min={0}` sull'input
            // blocca solo le frecce su/giù, non ciò che si digita a mano
            // (un "-" tastiera passa comunque). Scartato qui: un valore
            // negativo diventa 0 invece di essere salvato così com'è.
            onChange(Number.isNaN(parsed) ? null : Math.max(0, parsed))
          }}
          // "non lo so", non "—": dice chiaramente che lasciarlo vuoto è
          // una scelta valida (non hai controllato quel giorno), non solo
          // l'aspetto grafico di un campo senza valore — è il punto che
          // Claudio ha segnalato non essere chiaro dalla sola UI.
          placeholder="non lo so"
          // Era w-20 (80px) fisso: a card ristretta (blocco ridimensionato
          // piccolo) l'input non si adattava e "non lo so" + l'unità
          // uscivano dalla card — la stessa causa di fondo del bug
          // "kg/h... si fukka tutto" segnalato da Claudio, non solo la
          // griglia sopra. min-w-0 flex-1: prende lo spazio che c'è nella
          // riga, si restringe quando serve invece di sforare.
          className="font-mono min-w-0 flex-1 border-0 bg-transparent p-0 text-lg font-medium tabular-nums outline-none placeholder:text-ink-faint placeholder:text-[0.7rem] placeholder:tracking-tight"
        />
        <span className="text-ink-faint shrink-0 text-xs">{unit}</span>
      </div>
    </div>
  )
}
