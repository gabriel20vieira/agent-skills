export interface SecretRequest {
    title: string
    description?: string
    /** Shown once (generated password, invite link); the server keeps no readable copy. */
    secret: string
}

const done = new Set<() => void>()

export function closeSecret() {
    for (const resolve of done) resolve()
    done.clear()
}

/** `await showSecret({ title, secret })` resolves when the dialog is closed. */
export function useSecretDialog() {
    const current = useState<SecretRequest | null>("secret:current", () => null)
    return (request: SecretRequest) => new Promise<void>((resolve) => {
        done.add(resolve)
        current.value = request
    })
}
