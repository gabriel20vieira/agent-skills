<script setup lang="ts">
const { t } = useI18n()
const { loggedIn } = useSession()
const { status } = useRealtime()
const down = computed(() => loggedIn.value && (status.value === "closed" || status.value === "connecting"))

// Only after 2 s down: the first connect on every page load must not flash the badge.
const offline = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined
watch(down, (value) => {
    clearTimeout(timer)
    if (!value) offline.value = false
    else timer = setTimeout(() => (offline.value = true), 2000)
}, { immediate: true })
onScopeDispose(() => clearTimeout(timer))
</script>

<template>
    <ClientOnly>
        <span
            v-if="offline"
            role="status"
            class="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
        >
            <span class="size-2 animate-pulse rounded-full bg-warning" />
            {{ t("realtime.reconnecting") }}
        </span>
    </ClientOnly>
</template>
