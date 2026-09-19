import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto"

// No 0, O, 1, l or I: generated passwords are read off a screen and typed by hand.
const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ"

/** 16 characters in four groups (~92 bits); satisfies the 12-character minimum. */
export function generatePassword(): string {
    const groups = Array.from({ length: 4 }, () =>
        Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join(""),
    )
    return groups.join("-")
}

export function constantTimeEqual(a: string, b: string): boolean {
    const left = Buffer.from(a, "utf8")
    const right = Buffer.from(b, "utf8")
    if (left.length !== right.length) return false
    return timingSafeEqual(left, right)
}

/** Invite and similar tokens are stored hashed; only the holder of the link has the token. */
export function hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex")
}

export function newToken(): string {
    return randomBytes(32).toString("base64url")
}
