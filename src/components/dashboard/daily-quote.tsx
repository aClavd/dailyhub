import { giornoDellAnno } from "@/lib/datetime"

// Frasi vere di scienziate/i e persone che hanno lasciato il mondo un po'
// meglio di come l'hanno trovato. Una al giorno, a ciclo (17 giorni prima di
// ripetersi). Wording tradotto/verificato sulle fonti più citate.
const QUOTES: { text: string; author: string }[] = [
  { text: "Nella vita non c'è nulla da temere, solo da comprendere.", author: "Marie Curie" },
  { text: "L'immaginazione è più importante della conoscenza.", author: "Albert Einstein" },
  {
    text: "Se ho visto più lontano, è perché sono salito sulle spalle di giganti.",
    author: "Isaac Newton",
  },
  {
    text: "Il primo principio è non ingannare te stesso — e sei la persona più facile da ingannare.",
    author: "Richard Feynman",
  },
  { text: "Siamo fatti della materia delle stelle.", author: "Carl Sagan" },
  {
    text: "Mi piacciono i numeri: in un modo o nell'altro, hanno sempre una risposta giusta.",
    author: "Katherine Johnson",
  },
  {
    text: "La frase più pericolosa è: l'abbiamo sempre fatto così.",
    author: "Grace Hopper",
  },
  {
    text: "L'intelligenza è la capacità di adattarsi al cambiamento.",
    author: "Stephen Hawking",
  },
  {
    text: "Non temete i momenti difficili: il meglio viene da lì.",
    author: "Rita Levi-Montalcini",
  },
  {
    text: "Il presente è loro; il futuro, per cui ho davvero lavorato, è mio.",
    author: "Nikola Tesla",
  },
  {
    text: "A volte sono le persone che nessuno immagina possano fare nulla a fare le cose che nessuno può immaginare.",
    author: "Alan Turing",
  },
  {
    text: "Quello che fai fa la differenza. Devi decidere che differenza vuoi fare.",
    author: "Jane Goodall",
  },
  { text: "Sembra sempre impossibile, finché non è fatto.", author: "Nelson Mandela" },
  {
    text: "Un bambino, un insegnante, un libro e una penna possono cambiare il mondo.",
    author: "Malala Yousafzai",
  },
  {
    text: "La scienza e la vita quotidiana non possono e non devono essere separate.",
    author: "Rosalind Franklin",
  },
  { text: "Il caso favorisce solo le menti preparate.", author: "Louis Pasteur" },
  {
    text: "L'ignoranza genera più spesso fiducia della conoscenza.",
    author: "Charles Darwin",
  },
]

export function DailyQuote({ date = new Date() }: { date?: Date }) {
  const quote = QUOTES[giornoDellAnno(date) % QUOTES.length]
  return (
    <figure className="rounded-xl border border-border bg-card px-4 py-3 text-left">
      <figcaption className="text-[0.62rem] font-bold tracking-[0.14em] text-ink-faint uppercase">
        Frase del giorno
      </figcaption>
      <blockquote className="font-heading mt-1.5 text-sm leading-snug text-ink-soft italic">
        «{quote.text}»
      </blockquote>
      <p className="text-ink-faint mt-1.5 text-[0.7rem] not-italic">— {quote.author}</p>
    </figure>
  )
}
