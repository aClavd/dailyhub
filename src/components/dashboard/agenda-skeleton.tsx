import { Skeleton } from "@/components/ui/skeleton"

export function AgendaSkeletonBody() {
  return (
    <div className="space-y-3 py-1">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="grid grid-cols-[3.25rem_1fr] gap-3">
          <Skeleton className="h-4 w-10" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}
