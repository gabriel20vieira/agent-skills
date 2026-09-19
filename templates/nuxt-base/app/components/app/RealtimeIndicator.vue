<script setup lang="ts">
const { t } = useI18n()
const { loggedIn } = useSession()
const { status } = useRealtime()
// Only once a connection was attempted: nothing to say before the first connect.
const offline = computed(() => loggedIn.value && (status.value === "closed" || status.value === "connecting"))
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
