<script setup lang="ts">
const config = useRuntimeConfig()
</script>

<template>
    <div class="flex min-h-dvh flex-col items-center justify-center gap-6 bg-muted/40 px-4 py-10">
        <NuxtLink
            to="/"
            class="text-lg font-semibold tracking-tight"
        >
            {{ config.public.appName }}
        </NuxtLink>
        <div class="w-full max-w-sm">
            <slot />
        </div>
    </div>
</template>
