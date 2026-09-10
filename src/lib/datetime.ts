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

/** Distanza da adesso, in forma breve: "adesso", "tra 20 min", "tra 3 h". */
export function traQuanto(target: Date, now = new Date()): string {
  const minutes = Math.round((target.getTime() - now.getTime()) / 60_000)
  if (minutes <= 0) return "in corso"
  if (minutes < 60) return `tra ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `tra ${hours} h`
  return `tra ${Math.round(hours / 24)} g`
}
