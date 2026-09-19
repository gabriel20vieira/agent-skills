<script setup lang="ts">
// Landing page: replace with the project's own (the public-site module adds more).
definePageMeta({ layout: "public", auth: false })

const { t } = useI18n()
useHead({ title: () => t("home.title") })
const { loggedIn } = useSession()
</script>

<template>
    <section class="mx-auto max-w-2xl space-y-6 py-12 text-center">
        <h1 class="text-4xl font-semibold tracking-tight">
            {{ t("home.title") }}
        </h1>
        <p class="text-lg text-muted-foreground">
            {{ t("home.subtitle") }}
        </p>
        <Button
            as-child
            size="lg"
        >
            <NuxtLink :to="loggedIn ? '/app' : '/entrar'">
                {{ t("home.cta") }}
            </NuxtLink>
        </Button>
    </section>
</template>
