<script setup lang="ts">
const { t } = useI18n()
const session = useSession()
const api = useApi()

async function stop() {
    session.user.value = await api<AuthUser>("/api/auth/mimic", { method: "DELETE" })
}
</script>

<template>
    <div
        v-if="session.user.value?.mimicking"
        role="status"
        class="flex flex-wrap items-center justify-center gap-3 bg-warning/15 px-4 py-2 text-sm"
    >
        {{ t("mimic.banner", { roles: session.user.value.effectiveRoles.map(role => t(`roles.${role}`)).join(", ") }) }}
        <Button
            size="sm"
            variant="outline"
            @click="stop"
        >
            {{ t("mimic.stop") }}
        </Button>
    </div>
</template>
