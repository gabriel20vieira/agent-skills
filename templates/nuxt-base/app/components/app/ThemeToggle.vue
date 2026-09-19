<script setup lang="ts">
import { MonitorIcon, MoonIcon, SunIcon } from "@lucide/vue"

const { t } = useI18n()
const colorMode = useColorMode()
const modes = [
    { value: "light", icon: SunIcon },
    { value: "dark", icon: MoonIcon },
    { value: "system", icon: MonitorIcon },
] as const
</script>

<template>
    <DropdownMenu>
        <DropdownMenuTrigger as-child>
            <Button
                variant="ghost"
                size="icon"
                :aria-label="t('theme.mode')"
            >
                <!-- CSS, not colorMode.value: the server cannot know the mode. -->
                <SunIcon class="dark:hidden" />
                <MoonIcon class="hidden dark:block" />
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
            <DropdownMenuItem
                v-for="mode in modes"
                :key="mode.value"
                @select="colorMode.preference = mode.value"
            >
                <component
                    :is="mode.icon"
                    class="size-4"
                />
                {{ t(`theme.${mode.value}`) }}
            </DropdownMenuItem>
        </DropdownMenuContent>
    </DropdownMenu>
</template>
