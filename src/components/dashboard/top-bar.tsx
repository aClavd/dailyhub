import { signOut } from "@/auth"
import { Button } from "@/components/ui/button"

export function TopBar({ email }: { email?: string | null }) {
  return (
    <header className="flex items-center justify-between border-b border-border py-3.5">
      <div className="flex items-center gap-2">
        <span className="size-2 rounded-full bg-primary" />
        <span className="font-heading text-base font-semibold">
          <span className="font-normal text-ink-faint">Daily</span>Hub
        </span>
      </div>
      <div className="flex items-center gap-3">
        {email ? (
          <span className="hidden text-sm text-ink-soft sm:inline">{email}</span>
        ) : null}
        <form
          action={async () => {
            "use server"
            await signOut({ redirectTo: "/" })
          }}
        >
          <Button type="submit" variant="outline" size="sm">
            Esci
          </Button>
        </form>
      </div>
    </header>
  )
}
