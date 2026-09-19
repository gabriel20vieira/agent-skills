<script setup lang="ts">
import { DownloadIcon } from "@lucide/vue"

const { t } = useI18n()
const { installable, install } = usePwaInstall()
</script>

<template>
    <ClientOnly>
        <Button
            v-if="installable"
            variant="ghost"
            size="sm"
            @click="install"
        >
            <DownloadIcon /> {{ t("pwa.install") }}
        </Button>
    </ClientOnly>
</template>
