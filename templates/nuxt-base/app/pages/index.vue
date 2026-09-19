<script setup lang="ts">
import { MoonIcon, SunIcon } from "@lucide/vue"

definePageMeta({ layout: "public" })

const { t, locale, locales, setLocale } = useI18n()
const colorMode = useColorMode()

useHead({ title: () => t("home.title") })

// Read the mode only on click: the server cannot know it, so rendering from it would
// mismatch on hydration. The icons switch with the `dark:` variant instead.
function toggleDark() {
    colorMode.preference = colorMode.value === "dark" ? "light" : "dark"
}
</script>

<template>
    <section class="space-y-6">
        <div class="space-y-2">
            <h1 class="text-3xl font-semibold tracking-tight">
                {{ t("home.title") }}
            </h1>
            <p class="text-muted-foreground">
                {{ t("home.subtitle") }}
            </p>
        </div>
        <div class="flex flex-wrap gap-2">
            <Button>{{ t("home.cta") }}</Button>
            <Button
                variant="outline"
                size="icon"
                :aria-label="t('common.toggleDark')"
                @click="toggleDark"
            >
                <MoonIcon class="dark:hidden" />
                <SunIcon class="hidden dark:block" />
            </Button>
            <Button
                v-for="item in locales"
                :key="item.code"
                :variant="item.code === locale ? 'secondary' : 'ghost'"
                @click="setLocale(item.code)"
            >
                {{ item.name }}
            </Button>
        </div>
    </section>
</template>
