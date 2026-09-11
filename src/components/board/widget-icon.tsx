import type { SVGProps } from "react"

import type { WidgetType } from "@/lib/board"

const PATHS: Record<WidgetType, string> = {
  agenda:
    "M4 5h16a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM8 3v4M16 3v4M3 10h18",
  mail: "M3 6h18v12H3zM3 7l9 6 9-6",
  diario: "M5 4h11l3 3v13H5zM9 4v16",
  pomodoro: "M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 13V9M9 3h6",
  note: "M5 6h14M5 11h14M5 16h9",
  obiettivi: "M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  lettura:
    "M12 6c-2-1.4-5-1.9-8-1.4v12c3-.5 6 0 8 1.4 2-1.4 5-1.9 8-1.4v-12c-3-.5-6 0-8 1.4zM12 6v12",
  acqua: "M12 3s6 6.4 6 10.4a6 6 0 0 1-12 0C6 9.4 12 3 12 3z",
  meteo: "M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.3A3.5 3.5 0 0 1 17.5 18z",
}

export function WidgetIcon({
  type,
  ...props
}: { type: WidgetType } & SVGProps<SVGSVGElement>) {
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
      <path d={PATHS[type]} />
    </svg>
  )
}

export function GripIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <circle cx="9" cy="6" r="1.4" />
      <circle cx="15" cy="6" r="1.4" />
      <circle cx="9" cy="12" r="1.4" />
      <circle cx="15" cy="12" r="1.4" />
      <circle cx="9" cy="18" r="1.4" />
      <circle cx="15" cy="18" r="1.4" />
    </svg>
  )
}

/** Maniglia ad angolo (in basso a destra) per ridimensionare trascinando. */
export function ResizeCornerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M8 20 20 8M13 20 20 13M18 20 20 18" />
    </svg>
  )
}

export function ResizeIcon(props: SVGProps<SVGSVGElement>) {
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
      <path d="M4 15v5h5M20 9V4h-5M20 4l-7 7M4 20l7-7" />
    </svg>
  )
}
