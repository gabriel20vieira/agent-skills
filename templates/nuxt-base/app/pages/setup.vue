<script setup lang="ts">
import { MIN_PASSWORD_LENGTH } from "#shared/schemas/password"

definePageMeta({ layout: "auth", auth: "guest" })

const { t } = useI18n()
useHead({ title: () => t("auth.setup.title") })

const session = useSession()
const needsSetup = useState("auth:needsSetup")
const api = useApi()
const { run, pending, error } = useSubmit()
const form = reactive({ code: "", name: "", email: "", password: "" })

async function submit() {
    const ok = await run(() => api("/api/auth/setup", { method: "POST", body: form }))
    if (ok === undefined) return
    needsSetup.value = false
    await session.refresh()
    await navigateTo("/app")
}
</script>

<template>
    <Card>
        <CardHeader>
            <CardTitle>{{ t("auth.setup.title") }}</CardTitle>
            <CardDescription>{{ t("auth.setup.description") }}</CardDescription>
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
                    <Label for="code">{{ t("auth.setup.code") }}</Label>
                    <Input
                        id="code"
                        v-model="form.code"
                        autocomplete="off"
                        required
                    />
                </div>
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
                    <p class="text-sm text-muted-foreground">
                        {{ t("account.password.hint", { min: MIN_PASSWORD_LENGTH }) }}
                    </p>
                </div>
                <Button
                    type="submit"
                    :disabled="pending"
                >
                    {{ t("auth.setup.submit") }}
                </Button>
            </form>
        </CardContent>
    </Card>
</template>
