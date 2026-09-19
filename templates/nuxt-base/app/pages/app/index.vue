<script setup lang="ts">
// Placeholder dashboard; plan 4 moves it into the app layout.
definePageMeta({ layout: "public" })

const { t } = useI18n()
useHead({ title: () => t("dashboard.title") })

const session = useSession()
</script>

<template>
    <section
        v-if="session.user.value"
        class="space-y-4"
    >
        <h1 class="text-2xl font-semibold tracking-tight">
            {{ t("dashboard.welcome", { name: session.user.value.name }) }}
        </h1>
        <p class="text-muted-foreground">
            {{ t("dashboard.roles") }}:
            {{ session.user.value.roles.map(role => t(`roles.${role}`)).join(", ") }}
        </p>
        <Button
            variant="outline"
            @click="session.logout()"
        >
            {{ t("auth.signOut") }}
        </Button>
    </section>
</template>
