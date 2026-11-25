// UI-kit door: every `@/components/ui/*` module the ported sources import is
// aliased here. The SDK exports the app's own design-language components, so
// these are the same primitives the feature used in-tree.
export {
  Button,
  Codicon,
  ConfirmDialog,
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
  CopyButton,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tip,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Textarea
} from '@hermes/plugin-sdk'

import { cn } from '@hermes/plugin-sdk'

// The SDK's dropdown menu has no Label/Sub exports. A label is a presentation
// div; submenus are flattened by the menu's owner (see node-context-menu), so a
// small label component is all that is needed here.
export function DropdownMenuLabel({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-2 py-1.5 text-xs font-medium text-(--ui-text-tertiary)', className)} {...rest}>
      {children}
    </div>
  )
}
