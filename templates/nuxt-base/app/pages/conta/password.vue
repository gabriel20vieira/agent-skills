<script setup lang="ts">
import { MIN_PASSWORD_LENGTH } from "#shared/schemas/password"

definePageMeta({ layout: "auth" })

const { t } = useI18n()
useHead({ title: () => t("account.password.title") })

const session = useSession()
const api = useApi()
const { run, pending, error } = useSubmit()
const form = reactive({ current: "", next: "", confirm: "" })
const mismatch = computed(() => !!form.confirm && form.next !== form.confirm)

async function submit() {
    if (mismatch.value) return
    const ok = await run(() => api("/api/account/password", {
        method: "POST",
        body: { current: form.current, next: form.next },
    }))
    if (ok === undefined) return
    await session.refresh()
    await navigateTo("/app")
}
</script>

<template>
    <Card>
        <CardHeader>
            <CardTitle>{{ t("account.password.title") }}</CardTitle>
            <CardDescription v-if="session.user.value?.mustChangePassword">
                {{ t("account.password.forced") }}
            </CardDescription>
        </CardHeader>
        <CardContent>
            <form
                class="grid gap-4"
                @submit.prevent="submit"
            >
                <Alert
                    v-if="error"
                    variant="destructive"
                >
                    <AlertDescription>{{ error }}</AlertDescription>
                </Alert>
                <div class="grid gap-2">
                    <Label for="current">{{ t("account.password.current") }}</Label>
                    <Input
                        id="current"
                        v-model="form.current"
                        type="password"
                        autocomplete="current-password"
                        required
                    />
                </div>
                <div class="grid gap-2">
                    <Label for="next">{{ t("account.password.next") }}</Label>
                    <Input
                        id="next"
                        v-model="form.next"
                        type="password"
                        autocomplete="new-password"
                        :minlength="MIN_PASSWORD_LENGTH"
                        required
                    />
                    <p class="text-sm text-muted-foreground">
                        {{ t("account.password.hint", { min: MIN_PASSWORD_LENGTH }) }}
                    </p>
                </div>
                <div class="grid gap-2">
                    <Label for="confirm">{{ t("account.password.confirm") }}</Label>
                    <Input
                        id="confirm"
                        v-model="form.confirm"
                        type="password"
                        autocomplete="new-password"
                        :aria-invalid="mismatch"
                        required
                    />
                    <p
                        v-if="mismatch"
                        class="text-sm text-danger"
                    >
                        {{ t("account.password.mismatch") }}
                    </p>
                </div>
                <Button
                    type="submit"
                    :disabled="pending || mismatch"
                >
                    {{ t("account.password.submit") }}
                </Button>
            </form>
        </CardContent>
    </Card>
</template>
