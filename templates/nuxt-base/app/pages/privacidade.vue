<script setup lang="ts">
definePageMeta({ layout: "public", auth: false })

const { t } = useI18n()
useHead({ title: () => t("privacy.title") })
</script>

<template>
    <article class="max-w-2xl space-y-4">
        <h1 class="text-3xl font-semibold tracking-tight">
            {{ t("privacy.title") }}
        </h1>
        <p class="text-muted-foreground">
            {{ t("privacy.intro") }}
        </p>
        <h2 class="text-lg font-medium">
            {{ t("privacy.cookiesTitle") }}
        </h2>
        <p>{{ t("privacy.cookies") }}</p>
    </article>
</template>
