interface InstallPromptEvent extends Event {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

// Kept outside the composable: the browser fires beforeinstallprompt once per page load.
const deferred = shallowRef<InstallPromptEvent | null>(null)

/** Called by plugins/pwa.client.ts. */
export function captureInstallPrompt(event: Event) {
    event.preventDefault()
    deferred.value = event as InstallPromptEvent
}

/** "Install app" support: `installable` is true only where the browser offers it. */
export function usePwaInstall() {
    const installable = computed(() => deferred.value !== null)

    async function install() {
        const prompt = deferred.value
        if (!prompt) return false
        deferred.value = null
        await prompt.prompt()
        return (await prompt.userChoice).outcome === "accepted"
    }

    return { installable, install }
}
