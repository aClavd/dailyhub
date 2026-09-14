import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { cn } from "cn"

// Primo dialog del progetto: avvolge le primitive Base UI (già una
// dipendenza, stesso pattern già usato in button.tsx/badge.tsx) invece
// di costruire un overlay a mano — focus trap, Escape, click-fuori,
// aria arrivano gratis dalla libreria.
const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogClose = DialogPrimitive.Close

function DialogPopup({
  className,
  children,
  ...props
}: DialogPrimitive.Popup.Props) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop
        className={cn(
          "fixed inset-0 z-50 bg-black/40 transition-opacity",
          "data-[ending-style]:opacity-0 data-[starting-style]:opacity-0",
        )}
      />
      <DialogPrimitive.Popup
        className={cn(
          "bg-card border-border fixed top-1/2 left-1/2 z-50 flex max-h-[85vh] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border shadow-xl outline-none transition-all",
          "data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0",
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      className={cn("font-heading text-base font-medium", className)}
      {...props}
    />
  )
}

export { Dialog, DialogTrigger, DialogPopup, DialogTitle, DialogClose }
