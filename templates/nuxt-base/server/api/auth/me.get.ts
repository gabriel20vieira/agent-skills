/** The signed-in user, fresh from the database (the cookie snapshot may be stale). */
export default defineEventHandler((event) => {
    return requireUser(event, { allowPasswordChange: true })
})
