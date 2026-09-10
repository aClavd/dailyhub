const QUOTES = [
  "La costanza batte l'intensità: un piccolo passo, ma ogni giorno.",
  "Fatto è meglio che perfetto.",
  "Inizia dove sei, con quello che hai.",
  "Un giorno alla volta, ma tutti i giorni.",
  "La disciplina è ricordarsi cosa vuoi davvero.",
]

export function DailyQuote({ date = new Date() }: { date?: Date }) {
  const quote = QUOTES[date.getDate() % QUOTES.length]
  return (
    <figure className="rounded-xl border border-border bg-card px-4 py-3 text-left">
      <figcaption className="text-[0.62rem] font-bold tracking-[0.14em] text-ink-faint uppercase">
        Frase del giorno
      </figcaption>
      <blockquote className="font-heading mt-1.5 text-sm leading-snug text-ink-soft italic">
        «{quote}»
      </blockquote>
    </figure>
  )
}
