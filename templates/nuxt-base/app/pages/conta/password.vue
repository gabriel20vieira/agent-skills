<script setup lang="ts">
import { MIN_PASSWORD_LENGTH } from "#shared/schemas/password"

// A forced change happens before the app is usable: show it on the bare auth layout.
definePageMeta({
    titleKey: "account.password.title",
    layout: false,
})

const { t } = useI18n()
useHead({ title: () => t("account.password.title") })

const api = useApi()
const session = useSession()
const notify = useNotify()
const forced = computed(() => !!session.user.value?.mustChangePassword)
const { run, pending, error } = useSubmit()
const form = reactive({ current: "", next: "", confirm: "" })
const mismatch = computed(() => !!form.confirm && form.next !== form.confirm)

async function submit() {
    if (mismatch.value) return
    const wasForced = forced.value
    const ok = await run(() => api("/api/account/password", {
        method: "POST",
        body: { current: form.current, next: form.next },
    }))
    if (ok === undefined) return
    await session.refresh()
    notify.success("account.password.changed")
    await navigateTo(wasForced ? "/app" : "/conta")
}
</script>

<template>
    <NuxtLayout :name="forced ? 'auth' : 'app'">
        <Card class="max-w-md">
            <CardHeader>
                <CardTitle>{{ t("account.password.title") }}</CardTitle>
                <CardDescription v-if="forced">
                    {{ t("account.password.forced") }}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form
                    class="grid gap-4"
                    @submit.prevent="submit"
                >
                    <!-- Lets password managers tie the new password to the account. -->
                    <input
                        type="email"
                        autocomplete="username"
                        :value="session.user.value?.email"
                        class="sr-only"
                        tabindex="-1"
                        aria-hidden="true"
                        readonly
                    >
                    <Alert
                        v-if="error"
                        variant="destructive"
                    >
                        <AlertDescription>{{ error }}</AlertDescription>
                    </Alert>
                    <FormField
                        for="current"
                        :label="t('account.password.current')"
                    >
                        <Input
                            id="current"
                            v-model="form.current"
                            type="password"
                            autocomplete="current-password"
                            required
                        />
                    </FormField>
                    <FormField
                        for="next"
                        :label="t('account.password.next')"
                        :hint="t('account.password.hint', { min: MIN_PASSWORD_LENGTH })"
                    >
                        <Input
                            id="next"
                            v-model="form.next"
                            type="password"
                            autocomplete="new-password"
                            :minlength="MIN_PASSWORD_LENGTH"
                            required
                        />
                    </FormField>
                    <FormField
                        for="confirm"
                        :label="t('account.password.confirm')"
                        :error="mismatch ? t('account.password.mismatch') : undefined"
                    >
                        <Input
                            id="confirm"
                            v-model="form.confirm"
                            type="password"
                            autocomplete="new-password"
                            :aria-invalid="mismatch"
                            required
                        />
                    </FormField>
                    <Button
                        type="submit"
                        :disabled="pending || mismatch"
                    >
                        {{ t("account.password.submit") }}
                    </Button>
                </form>
            </CardContent>
        </Card>
    </NuxtLayout>
</template>
