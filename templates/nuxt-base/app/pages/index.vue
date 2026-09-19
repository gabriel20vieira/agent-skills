<script setup lang="ts">
import { MoonIcon, SunIcon } from "@lucide/vue"

definePageMeta({ layout: "public" })

const colorMode = useColorMode()

// Read the mode only on click: the server cannot know it, so rendering from it would
// mismatch on hydration. The icons switch with the `dark:` variant instead.
function toggleDark() {
    colorMode.preference = colorMode.value === "dark" ? "light" : "dark"
}
</script>

<template>
    <section class="space-y-6">
        <h1 class="text-3xl font-semibold tracking-tight">
            nuxt-base
        </h1>
        <div class="flex gap-2">
            <Button>Primary</Button>
            <Button
                variant="outline"
                size="icon"
                aria-label="Toggle dark mode"
                @click="toggleDark"
            >
                <MoonIcon class="dark:hidden" />
                <SunIcon class="hidden dark:block" />
            </Button>
        </div>
    </section>
</template>
