<script setup lang="ts">
definePageMeta({ layout: "auth", auth: "guest" })

const { t } = useI18n()
useHead({ title: () => t("auth.signIn.title") })

const route = useRoute()
const session = useSession()
const api = useApi()
const { run, pending, error } = useSubmit()
const form = reactive({ email: "", password: "", remember: false })

async function submit() {
    const ok = await run(() => api("/api/auth/login", { method: "POST", body: form }))
    if (ok === undefined) return
    await session.refresh()
    const target = typeof route.query.redirect === "string" && route.query.redirect.startsWith("/")
        ? route.query.redirect
        : "/app"
    await navigateTo(target)
}
</script>

<template>
    <Card>
        <CardHeader>
            <CardTitle>{{ t("auth.signIn.title") }}</CardTitle>
            <CardDescription>{{ t("auth.signIn.description") }}</CardDescription>
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
                        autocomplete="current-password"
                        required
                    />
                </div>
                <div class="flex items-center gap-2">
                    <Checkbox
                        id="remember"
                        v-model="form.remember"
                    />
                    <Label
                        for="remember"
                        class="font-normal"
                    >{{ t("auth.signIn.remember") }}</Label>
                </div>
                <Button
                    type="submit"
                    :disabled="pending"
                >
                    {{ t("auth.signIn.submit") }}
                </Button>
            </form>
        </CardContent>
    </Card>
</template>
