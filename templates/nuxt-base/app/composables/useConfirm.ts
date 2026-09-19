export interface ConfirmOptions {
    title: string
    description?: string
    confirmLabel?: string
    cancelLabel?: string
    destructive?: boolean
    /** The user must type this text (e.g. the item's name) before confirming. */
    typeToConfirm?: string
    /** Runs inside the dialog: pending state, and errors are shown in place (dialog stays open). */
    action?: () => Promise<unknown>
}

export interface ConfirmRequest extends ConfirmOptions {
    id: number
}

// Resolvers never go through useState: they are client-only functions.
const resolvers = new Map<number, (value: boolean) => void>()
let nextId = 1

export function settleConfirm(id: number, value: boolean) {
    resolvers.get(id)?.(value)
    resolvers.delete(id)
}

/**
 * `if (await confirm({ title, destructive: true, action: () => api(...) })) ...`
 * One <ConfirmHost/> (in app.vue) renders the dialog. Never use window.confirm: it blocks
 * the thread, the WebSocket included.
 */
export function useConfirm() {
    const current = useState<ConfirmRequest | null>("confirm:current", () => null)
    return (options: ConfirmOptions) => new Promise<boolean>((resolve) => {
        if (current.value) settleConfirm(current.value.id, false)
        const id = nextId++
        resolvers.set(id, resolve)
        current.value = { ...options, id }
    })
}
