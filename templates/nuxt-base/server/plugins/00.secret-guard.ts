export default defineNitroPlugin(() => {
    if (!isWeakSecret(process.env.NUXT_SESSION_PASSWORD)) return
    const message = "[secret-guard] NUXT_SESSION_PASSWORD is missing, shorter than 32 characters "
        + "or a placeholder. Generate one with scripts/gen-secrets.ps1 (or .sh)."
    if (import.meta.dev) {
        console.warn(message)
        return
    }
    throw new Error(message)
})
