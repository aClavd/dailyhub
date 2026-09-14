const GIORNI = [
  "domenica",
  "lunedì",
  "martedì",
  "mercoledì",
  "giovedì",
  "venerdì",
  "sabato",
]

const MESI = [
  "gennaio",
  "febbraio",
  "marzo",
  "aprile",
  "maggio",
  "giugno",
  "luglio",
  "agosto",
  "settembre",
  "ottobre",
  "novembre",
  "dicembre",
]

/** Saluto in base all'ora: buondì / buon pomeriggio / buonasera. */
export function greeting(date = new Date()): string {
  const h = date.getHours()
  if (h < 12) return "buondì"
  if (h < 18) return "buon pomeriggio"
  return "buonasera"
}

/** Es. "mercoledì 10 settembre 2026". */
export function dataEstesa(date = new Date()): string {
  return `${GIORNI[date.getDay()]} ${date.getDate()} ${MESI[date.getMonth()]} ${date.getFullYear()}`
}

export function inizioGiornata(date = new Date()): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function fineGiornata(date = new Date()): Date {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

/** Es. "09:30". */
export function oraBreve(value: string | Date): string {
  return new Intl.DateTimeFormat("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

/** Chiave giorno per lo storage locale, es. "2026-09-10". */
export function chiaveGiorno(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/** Chiave settimana ISO, es. "2026-W37". */
export function chiaveSettimana(date = new Date()): string {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  )
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
  )
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`
}

const GIORNI_BREVI = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"]

/** Data breve per liste/cronologia, es. "mer 10". */
export function dataBreve(date = new Date()): string {
  return `${GIORNI_BREVI[date.getDay()]} ${date.getDate()}`
}

/** Giorno dell'anno (1-366), per far ruotare contenuti "uno al giorno". */
export function giornoDellAnno(date = new Date()): number {
  const start = new Date(date.getFullYear(), 0, 0)
  return Math.floor((date.getTime() - start.getTime()) / 86_400_000)
}

/** Distanza da adesso, in forma breve: "adesso", "tra 20 min", "tra 3 h". */
export function traQuanto(target: Date, now = new Date()): string {
  const minutes = Math.round((target.getTime() - now.getTime()) / 60_000)
  if (minutes <= 0) return "in corso"
  if (minutes < 60) return `tra ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `tra ${hours} h`
  return `tra ${Math.round(hours / 24)} g`
}

/** Lunedì della settimana di `date` (mezzanotte locale) — settimana
 * italiana, non domenica-primo. */
function lunediSettimana(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() || 7 // domenica: getDay()=0 -> 7, così è l'ultimo giorno, non il primo
  d.setDate(d.getDate() - (day - 1))
  return d
}

/** I 7 giorni (lunedì→domenica) della settimana di `cursor`. */
export function weekDates(cursor = new Date()): Date[] {
  const start = lunediSettimana(cursor)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

/** Le 6 settimane (42 giorni, lunedì-primo) che coprono il mese di
 * `cursor`, code del mese precedente/successivo incluse apposta per
 * riempire sempre una griglia rettangolare. */
export function monthGrid(cursor = new Date()): Date[] {
  const firstOfMonth = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const start = lunediSettimana(firstOfMonth)
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

/** Es. "settembre 2026". */
export function meseAnno(date = new Date()): string {
  return `${MESI[date.getMonth()]} ${date.getFullYear()}`
}

/** L'inverso di chiaveGiorno: da "2026-09-14" a un Date a mezzanotte
 * locale. Puro (stesso input, stesso output) — usarlo al posto di
 * `new Date()` per gli stati iniziali di un componente client evita di
 * chiamare una funzione impura ("adesso") durante il render. */
export function parseChiave(key: string): Date {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(y, m - 1, d)
}

/** Somma (o sottrae, con n negativo) giorni a una data, senza mutarla. */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

/** Somma (o sottrae) mesi a una data, riportandola al giorno 1 — per la
 * navigazione mese-per-mese di un calendario, dove il giorno esatto di
 * partenza non conta. */
export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1)
}
