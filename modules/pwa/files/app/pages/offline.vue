<script setup lang="ts">
import { WifiOffIcon } from "@lucide/vue"

// Cached by the service worker at install and shown for navigations while offline.
definePageMeta({ layout: "blank", auth: false })

const { t } = useI18n()
useHead({ title: () => t("pwa.offline.title") })

function retry() {
    window.location.reload()
}
</script>

<template>
    <div class="grid min-h-dvh place-items-center p-6">
        <EmptyState
            :icon="WifiOffIcon"
            :title="t('pwa.offline.title')"
            :description="t('pwa.offline.body')"
        >
            <template #action>
                <Button @click="retry">
                    {{ t("pwa.offline.retry") }}
                </Button>
            </template>
        </EmptyState>
    </div>
</template>
