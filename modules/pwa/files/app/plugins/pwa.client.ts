// Registers the service worker (not in dev: it would fight Vite's HMR) and keeps the
// install prompt for <InstallAppButton>.
export default defineNuxtPlugin(() => {
    window.addEventListener("beforeinstallprompt", captureInstallPrompt)
    if (import.meta.dev || !("serviceWorker" in navigator)) return
    const register = () => {
        navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
            console.warn("[pwa] service worker registration failed", error)
        })
    }
    // Plugins often run after the load event already fired.
    if (document.readyState === "complete") register()
    else window.addEventListener("load", register, { once: true })
})
