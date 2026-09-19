<script setup lang="ts">
import { MIN_PASSWORD_LENGTH } from "#shared/schemas/password"

definePageMeta({ layout: "auth", auth: "guest" })

const { t } = useI18n()
useHead({ title: () => t("auth.invite.title") })

const route = useRoute()
const token = computed(() => String(route.params.token))
const session = useSession()
const { data: invite } = await useFetch(() => `/api/invites/${token.value}`)
const api = useApi()
const { run, pending, error } = useSubmit()
const form = reactive({ name: "", email: invite.value?.email ?? "", password: "" })

async function submit() {
    const ok = await run(() => api(`/api/invites/${token.value}/accept`, { method: "POST", body: form }))
    if (ok === undefined) return
    await session.refresh()
    await navigateTo("/app")
}
</script>

<template>
    <Card>
        <CardHeader>
            <CardTitle>{{ t("auth.invite.title") }}</CardTitle>
            <CardDescription>{{ t("auth.invite.description") }}</CardDescription>
        </CardHeader>
        <CardContent>
            <Alert
                v-if="!invite?.valid"
                variant="destructive"
            >
                <AlertDescription>{{ t("auth.invite.invalid") }}</AlertDescription>
            </Alert>
            <form
                v-else
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
                    <Label for="name">{{ t("auth.name") }}</Label>
                    <Input
                        id="name"
                        v-model="form.name"
                        autocomplete="name"
                        required
                    />
                </div>
                <div class="grid gap-2">
                    <Label for="email">{{ t("auth.email") }}</Label>
                    <Input
                        id="email"
                        v-model="form.email"
                        type="email"
                        autocomplete="email"
                        :readonly="!!invite.email"
                        required
                    />
                </div>
                <div class="grid gap-2">
                    <Label for="password">{{ t("auth.password") }}</Label>
                    <Input
                        id="password"
                        v-model="form.password"
                        type="password"
                        autocomplete="new-password"
                        :minlength="MIN_PASSWORD_LENGTH"
                        required
                    />
                </div>
                <Button
                    type="submit"
                    :disabled="pending"
                >
                    {{ t("auth.invite.submit") }}
                </Button>
            </form>
        </CardContent>
    </Card>
</template>
