/** NAVIGATION filtered by the user's effective roles; empty groups are dropped. */
export function useNavigation() {
    const allowed = useCan()
    return computed(() => NAVIGATION
        .map(group => ({ ...group, items: group.items.filter(item => !item.permission || allowed(...item.permission)) }))
        .filter(group => group.items.length > 0))
}
