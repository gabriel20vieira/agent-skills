<script setup lang="ts">
// Example public page: copy it for each new one and add it to shared/utils/publicPages.ts.
definePageMeta({ layout: "public", auth: false })

const { t } = useI18n()
usePageSeo({ titleKey: "about.title", descriptionKey: "about.description" })
</script>

<template>
    <article class="max-w-2xl space-y-4">
        <h1 class="text-3xl font-semibold tracking-tight">
            {{ t("about.title") }}
        </h1>
        <p class="text-lg text-muted-foreground">
            {{ t("about.description") }}
        </p>
        <p>{{ t("about.body") }}</p>
    </article>
</template>
