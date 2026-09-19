/** `const allowed = useCan(); allowed("users", "read")` — same matrix the server enforces. */
export function useCan() {
    const { user } = useSession()
    return (resource: Resource, action: Action) => !!user.value && can(user.value.effectiveRoles, resource, action)
}
