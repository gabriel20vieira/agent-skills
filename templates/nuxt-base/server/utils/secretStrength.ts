const PLACEHOLDERS = ["change-me", "changeme", "example", "dev-only", "min-32-chars"]

/** A predictable session secret lets anyone forge a session cookie. */
export function isWeakSecret(secret: string | undefined): boolean {
    if (!secret || secret.length < 32) return true
    const lower = secret.toLowerCase()
    return PLACEHOLDERS.some(marker => lower.includes(marker))
}
