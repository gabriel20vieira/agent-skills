import { countUsers } from "../../services/users"

/** Public: the route middleware needs it to send a fresh install to /setup. */
export default defineEventHandler(async (event) => {
    return {
        needsSetup: (await countUsers()) === 0,
        setupEnabled: !!useRuntimeConfig(event).setupCode,
    }
})
