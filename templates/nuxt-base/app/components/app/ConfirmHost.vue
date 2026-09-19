<script setup lang="ts">
const { t } = useI18n()
const current = useState<ConfirmRequest | null>("confirm:current", () => null)
const typed = ref("")
const pending = ref(false)
const error = ref("")
const toMessage = useErrorMessage()

const open = computed({
    get: () => !!current.value,
    set: (value) => {
        if (!value && !pending.value) finish(false)
    },
})
const blocked = computed(() =>
    pending.value || (!!current.value?.typeToConfirm && typed.value.trim() !== current.value.typeToConfirm))

watch(() => current.value?.id, () => {
    typed.value = ""
    error.value = ""
})

function finish(value: boolean) {
    if (!current.value) return
    settleConfirm(current.value.id, value)
    current.value = null
}

async function confirm() {
    if (!current.value || blocked.value) return
    if (!current.value.action) return finish(true)
    pending.value = true
    error.value = ""
    try {
        await current.value.action()
        finish(true)
    }
    catch (caught) {
        error.value = toMessage(caught)
    }
    finally {
        pending.value = false
    }
}
</script>

<template>
    <AlertDialog v-model:open="open">
        <AlertDialogContent v-if="current">
            <AlertDialogHeader>
                <AlertDialogTitle>{{ current.title }}</AlertDialogTitle>
                <AlertDialogDescription :class="{ 'sr-only': !current.description }">
                    {{ current.description || current.title }}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <div
                v-if="current.typeToConfirm"
                class="grid gap-2"
            >
                <Label for="confirm-type">{{ t("confirm.typeToConfirm", { text: current.typeToConfirm }) }}</Label>
                <Input
                    id="confirm-type"
                    v-model="typed"
                    autocomplete="off"
                    @keydown.enter.prevent="confirm"
                />
            </div>
            <Alert
                v-if="error"
                variant="destructive"
            >
                <AlertDescription>{{ error }}</AlertDescription>
            </Alert>
            <AlertDialogFooter>
                <AlertDialogCancel :disabled="pending">
                    {{ current.cancelLabel ?? t("common.cancel") }}
                </AlertDialogCancel>
                <Button
                    :variant="current.destructive ? 'destructive' : 'default'"
                    :disabled="blocked"
                    @click="confirm"
                >
                    {{ current.confirmLabel ?? t("common.confirm") }}
                </Button>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
</template>
