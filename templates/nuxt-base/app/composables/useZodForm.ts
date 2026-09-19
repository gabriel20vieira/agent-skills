import type { z } from "zod"

/**
 * A form bound to a shared zod schema: validates on the client with the same schema the
 * server uses, maps server `validation.invalid` issues back onto fields, and exposes a
 * single pending/error state.
 *
 *   const form = useZodForm(noteCreateSchema, { title: "", body: "" })
 *   await form.submit(data => api("/api/notes", { method: "POST", body: data }))
 */
export function useZodForm<S extends z.ZodObject>(schema: S, initial: z.input<S>) {
    const { t, te } = useI18n()
    const toMessage = useErrorMessage()
    const values = reactive({ ...initial }) as z.input<S>
    const errors = reactive<Record<string, string>>({})
    const pending = ref(false)
    const formError = ref("")

    function message(code: string) {
        const key = `validation.${code}`
        return te(key) ? t(key) : t("validation.invalid_field")
    }

    function setErrors(issues: FieldIssue[]) {
        for (const [field, code] of Object.entries(firstIssueByField(issues))) errors[field] = message(code)
    }

    function clear() {
        for (const key of Object.keys(errors)) Reflect.deleteProperty(errors, key)
        formError.value = ""
    }

    async function submit<T>(action: (data: z.output<S>) => Promise<T>): Promise<T | undefined> {
        if (pending.value) return
        clear()
        const parsed = schema.safeParse(values)
        if (!parsed.success) {
            setErrors(zodIssues(parsed.error))
            return
        }
        pending.value = true
        try {
            return await action(parsed.data)
        }
        catch (error) {
            const issues = serverIssues(error)
            if (issues.length) setErrors(issues)
            else formError.value = toMessage(error)
        }
        finally {
            pending.value = false
        }
    }

    function reset(next: z.input<S> = initial) {
        Object.assign(values as object, next)
        clear()
    }

    return { values, errors, pending, formError, submit, reset }
}
