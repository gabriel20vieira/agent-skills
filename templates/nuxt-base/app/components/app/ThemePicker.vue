<script setup lang="ts">
import { CheckIcon } from "@lucide/vue"

const { t } = useI18n()
const { theme, themes, setTheme } = useAppTheme()
const notify = useNotify()

async function pick(name: ThemeName) {
    try {
        await setTheme(name)
    }
    catch (error) {
        notify.error(error)
    }
}
</script>

<template>
    <div
        class="flex flex-wrap gap-2"
        role="radiogroup"
        :aria-label="t('theme.colour')"
    >
        <button
            v-for="item in themes"
            :key="item.name"
            type="button"
            role="radio"
            :aria-checked="theme === item.name"
            class="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent data-[checked=true]:border-primary"
            :data-checked="theme === item.name"
            @click="pick(item.name)"
        >
            <span
                class="grid size-5 place-items-center rounded-full"
                :style="{ background: item.swatch }"
            >
                <CheckIcon
                    v-if="theme === item.name"
                    class="size-3 text-white"
                />
            </span>
            {{ t(`theme.names.${item.name}`) }}
        </button>
    </div>
</template>
