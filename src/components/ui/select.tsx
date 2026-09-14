import { Select as SelectPrimitive } from "@base-ui/react/select"
import { cn } from "cn"

// Stesso pattern di dialog.tsx: avvolge le primitive Base UI (già una
// dipendenza) invece di costruire un menu a tendina a mano.
const Select = SelectPrimitive.Root
const SelectValue = SelectPrimitive.Value
const SelectItemText = SelectPrimitive.ItemText

function SelectTrigger({ className, children, ...props }: SelectPrimitive.Trigger.Props) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        "border-border bg-card text-ink-soft hover:text-foreground hover:border-ink-faint flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon className="text-ink-faint">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-3">
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectPopup({ className, children, ...props }: SelectPrimitive.Popup.Props) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner sideOffset={6} align="start">
        <SelectPrimitive.Popup
          className={cn(
            "bg-card border-border z-50 max-h-64 min-w-[10rem] overflow-y-auto rounded-lg border p-1 shadow-lg outline-none",
            "data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 transition-all",
            className,
          )}
          {...props}
        >
          {children}
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  )
}

function SelectItem({ className, children, ...props }: SelectPrimitive.Item.Props) {
  return (
    <SelectPrimitive.Item
      className={cn(
        "text-ink-soft data-[highlighted]:bg-muted data-[highlighted]:text-foreground flex cursor-default items-center rounded-md px-2 py-1.5 text-xs outline-none select-none",
        className,
      )}
      {...props}
    >
      {children}
    </SelectPrimitive.Item>
  )
}

export { Select, SelectTrigger, SelectValue, SelectPopup, SelectItem, SelectItemText }
