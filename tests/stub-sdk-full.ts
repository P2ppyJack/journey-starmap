/**
 * Stub of @hermes/plugin-sdk for the node tests (register + render paths only).
 * Mirrors the exported names the ported code imports. The smoke test uses its
 * own smaller stub (tests/stub-sdk.ts); this one also covers host + the UI kit.
 */

type Listener<T> = (value: T) => void

export function atom<T>(initial: T) {
  let value = initial
  const listeners = new Set<Listener<T>>()

  return {
    get: () => value,
    set(next: T) {
      value = next
      listeners.forEach(listener => listener(value))
    },
    listen(listener: Listener<T>) {
      listeners.add(listener)

      return () => listeners.delete(listener)
    },
    subscribe(listener: Listener<T>) {
      listeners.add(listener)
      listener(value)

      return () => listeners.delete(listener)
    }
  }
}

export const computed = (_stores: unknown, _fn: () => unknown) => atom(undefined as unknown)

export const ROUTES_AREA = 'routes'
export const SIDEBAR_NAV_AREA = 'sidebar.nav'
export const PALETTE_AREA = 'palette'
export const KEYBINDS_AREA = 'keybinds'
export const PANES_AREA = 'panes'
export const STATUSBAR_AREAS = { left: 'statusBar.left', right: 'statusBar.right' }

export const host = {
  composer: {
    focus: () => undefined,
    getDraft: async () => null,
    insertText: async () => true,
    setDraft: async () => true,
    submit: () => true
  },
  navigate: () => undefined,
  notify: () => 'toast',
  notifyError: () => 'toast',
  onEvent: () => () => undefined,
  openSession: () => undefined,
  request: async () => ({}),
  newChat: () => undefined,
  profiles: { list: async () => ({ profiles: [] }) },
  state: {
    activeSessionId: atom<string | null>(null),
    focusedSessionId: atom<string | null>(null),
    gateway: atom('open'),
    profile: atom('default')
  }
}

export const usePluginI18n = () => (key: string) => key
export const useValue = <T,>(store: { get: () => T }) => store.get()
export const cn = (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' ')
export const haptic = () => undefined
export const useQuery = () => ({ data: undefined, isLoading: false })
export const useMutation = () => ({ isPending: false, mutate: () => undefined })

const Null = function Null() {
  return null
}

export const Button = Null
export const Tip = Null
export const Tooltip = Null
export const TooltipContent = Null
export const TooltipProvider = Null
export const TooltipTrigger = Null
export const Textarea = Null
export const Codicon = Null
export const ConfirmDialog = Null
export const CopyButton = Null
export const Dialog = Null
export const DialogContent = Null
export const DialogDescription = Null
export const DialogFooter = Null
export const DialogHeader = Null
export const DialogTitle = Null
export const DialogTrigger = Null
export const DropdownMenu = Null
export const DropdownMenuContent = Null
export const DropdownMenuItem = Null
export const DropdownMenuSeparator = Null
export const DropdownMenuTrigger = Null
export const ContextMenu = Null
export const ContextMenuCheckboxItem = Null
export const ContextMenuContent = Null
export const ContextMenuItem = Null
export const ContextMenuSeparator = Null
export const ContextMenuSub = Null
export const ContextMenuSubContent = Null
export const ContextMenuSubTrigger = Null
export const ContextMenuTrigger = Null
export const Popover = Null
export const PopoverContent = Null
export const PopoverTrigger = Null
export const ScrollArea = Null
export const SearchField = Null
export const Badge = Null
export const icons = new Proxy({}, { get: () => function Icon() { return null } })
