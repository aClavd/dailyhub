import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function MailPlaceholder() {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Mail importanti</CardTitle>
        <CardAction>
          <span className="font-mono text-[0.7rem] tracking-wide text-ink-faint uppercase">
            Fase 3
          </span>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="py-8 text-center text-sm text-ink-faint">
          Gmail + Libero, in sola lettura. Arriva nella Fase 3.
        </p>
      </CardContent>
    </Card>
  )
}
