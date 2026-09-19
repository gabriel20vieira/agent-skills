<script setup lang="ts">
import { CheckIcon, CopyIcon } from "@lucide/vue"

const { t } = useI18n()
const current = useState<SecretRequest | null>("secret:current", () => null)
const copied = ref(false)

const open = computed({
    get: () => !!current.value,
    set: (value) => {
        if (!value) {
            current.value = null
            copied.value = false
            closeSecret()
        }
    },
})

async function copy() {
    if (!current.value) return
    await navigator.clipboard.writeText(current.value.secret)
    copied.value = true
}
</script>

<template>
    <Dialog v-model:open="open">
        <DialogContent v-if="current">
            <DialogHeader>
                <DialogTitle>{{ current.title }}</DialogTitle>
                <DialogDescription>
                    {{ current.description ?? t("secret.shownOnce") }}
                </DialogDescription>
            </DialogHeader>
            <div class="flex items-center gap-2">
                <code class="flex-1 break-all rounded-md border bg-muted px-3 py-2 font-mono text-sm">{{ current.secret }}</code>
                <Button
                    variant="outline"
                    size="icon"
                    :aria-label="t('secret.copy')"
                    @click="copy"
                >
                    <CheckIcon v-if="copied" />
                    <CopyIcon v-else />
                </Button>
            </div>
            <DialogFooter>
                <Button @click="open = false">
                    {{ t("common.close") }}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
