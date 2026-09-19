<script setup lang="ts">
const config = useRuntimeConfig()
const localeHead = useLocaleHead()

useHead(() => ({
    htmlAttrs: { lang: localeHead.value.htmlAttrs?.lang },
    titleTemplate: (title?: string) =>
        title ? `${title} · ${config.public.appName}` : config.public.appName,
}))
</script>

<template>
    <NuxtLayout>
        <NuxtPage />
    </NuxtLayout>
</template>
