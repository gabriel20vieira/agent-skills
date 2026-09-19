import { toast } from "vue-sonner"

/** Toasts with translated text: `notify.success("notes.saved")`, `notify.error(error)`. */
export function useNotify() {
    const { t, te } = useI18n()
    const toMessage = useErrorMessage()
    const text = (keyOrText: string, params?: Record<string, unknown>) =>
        te(keyOrText) ? t(keyOrText, params ?? {}) : keyOrText

    return {
        success: (keyOrText: string, params?: Record<string, unknown>) => toast.success(text(keyOrText, params)),
        info: (keyOrText: string, params?: Record<string, unknown>) => toast.info(text(keyOrText, params)),
        error: (error: unknown) => toast.error(toMessage(error)),
    }
}
