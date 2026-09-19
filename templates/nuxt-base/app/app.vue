<script setup lang="ts">
const config = useRuntimeConfig()
// Only lang: SEO alternate links need a baseUrl, which the public-site module sets.
const localeHead = useLocaleHead({ seo: false })

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
    <!-- Global hosts: one dialog/toast outlet for the whole app. -->
    <ConfirmHost />
    <SecretHost />
    <Toaster
        rich-colors
        position="top-center"
    />
</template>
