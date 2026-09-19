import { Hash } from "@adonisjs/hash"
import { Scrypt } from "@adonisjs/hash/drivers/scrypt"

// Same library and default options as nuxt-auth-utils' hashPassword, so hashes made
// here verify in the app (and vice versa).
const hash = new Hash(new Scrypt({}))

export function hashPassword(password) {
    return hash.make(password)
}

export function verifyPassword(hashed, password) {
    return hash.verify(hashed, password)
}
