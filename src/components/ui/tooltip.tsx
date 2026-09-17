import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"
import { cn } from "cn"

// Stesso pattern di dialog.tsx/select.tsx: avvolge le primitive Base UI
// (già una dipendenza) invece di costruire un popover a mano — hover-intent
// (delay), posizionamento, portale, tutto gratis dalla libreria. Prima
// micro-preview di questo tipo nel progetto (Right Rail/rail compressi,
// Attention Rail) — nessun tooltip.tsx esisteva ancora.
const Tooltip = TooltipPrimitive.Root
const TooltipTrigger = TooltipPrimitive.Trigger

function TooltipPopup({
  className,
  children,
  side = "right",
  sideOffset = 8,
  ...props
}: TooltipPrimitive.Popup.Props & Pick<TooltipPrimitive.Positioner.Props, "side" | "sideOffset">) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner side={side} sideOffset={sideOffset}>
        <TooltipPrimitive.Popup
          className={cn(
            // Un chip scuro piccolo, non una card — coerente con l'editoriale
            // (niente bordo/ombra pesante). bg-foreground/text-background:
            // si inverte da solo in dark mode con gli stessi due token già
            // usati ovunque, nessun colore nuovo.
            "bg-foreground text-background z-50 max-w-56 rounded-md px-2.5 py-1.5 text-xs shadow-md transition-all motion-reduce:transition-opacity",
            "data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0",
            "motion-reduce:data-[ending-style]:scale-100 motion-reduce:data-[starting-style]:scale-100",
            className,
          )}
          {...props}
        >
          {children}
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipTrigger, TooltipPopup }
