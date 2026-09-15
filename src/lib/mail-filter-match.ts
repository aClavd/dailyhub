import type { MailMessage } from "@/lib/mail"
import type { MailFilterSummary } from "@/lib/queries/mail-filters"

/** Una regola combacia se il suo testo (case-insensitive) compare nel
 * mittente O nell'oggetto — una sola regola vale per entrambi i campi,
 * niente "campo" da scegliere ogni volta (mail-filter-dialog.tsx).
 *
 * Spostata qui da mail-notifier.tsx (Right Sidebar, Fase B): serve anche
 * al pannello destro per contare le mail importanti ancora da gestire
 * (right-panel-live.tsx) — stessa regola dei popup, non una seconda
 * riscritta apposta. Nessun "server-only" qui (a differenza di lib/mail.ts,
 * da cui viene solo il TIPO MailMessage, erasi a compile-time): questo
 * file deve poter girare anche lato client.
 */
export function matchingFilter(
  message: MailMessage,
  filters: readonly MailFilterSummary[],
): MailFilterSummary | null {
  const haystack = `${message.from} ${message.subject}`.toLowerCase()
  return filters.find((f) => haystack.includes(f.pattern.toLowerCase())) ?? null
}
