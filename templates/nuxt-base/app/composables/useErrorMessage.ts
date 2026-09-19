/** Turns any API error into a translated sentence: errors.<code>, else the server message. */
export function useErrorMessage() {
    const { t, te } = useI18n()
    return (error: unknown) => {
        const info = extractApiError(error)
        const key = `errors.${info.code}`
        if (te(key)) return t(key)
        return info.message || t("errors.unknown")
    }
}
