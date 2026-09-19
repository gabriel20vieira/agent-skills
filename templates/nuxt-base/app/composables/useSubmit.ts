/**
 * Pending + translated error around one async action, for forms:
 * `const { run, pending, error } = useSubmit(); await run(() => api(...))`.
 */
export function useSubmit() {
    const pending = ref(false)
    const error = ref("")
    const toMessage = useErrorMessage()

    async function run<T>(action: () => Promise<T>): Promise<T | undefined> {
        if (pending.value) return
        pending.value = true
        error.value = ""
        try {
            return await action()
        }
        catch (caught) {
            error.value = toMessage(caught)
        }
        finally {
            pending.value = false
        }
    }

    return { run, pending, error }
}
