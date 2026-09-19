<script setup lang="ts">
import { MonitorSmartphoneIcon } from "@lucide/vue"
import { profileSchema } from "#shared/schemas/account"

definePageMeta({ layout: "app", titleKey: "account.title" })

interface SessionItem {
    id: string
    ip: string
    userAgent: string
    lastSeenAt: string
    current: boolean
}

const { t, d } = useI18n()
useHead({ title: () => t("account.title") })

const api = useApi()
const session = useSession()
const confirm = useConfirm()
const notify = useNotify()
const { userThemes } = useAppTheme()

const form = useZodForm(profileSchema, { name: session.user.value?.name ?? "" })

async function saveProfile() {
    const saved = await form.submit(data => api<AuthUser>("/api/account", { method: "PATCH", body: { name: data.name } }))
    if (!saved) return
    session.user.value = saved
    notify.success("account.saved")
}

const { data: sessions, refresh } = await useAsyncData("account:sessions", () => api<SessionItem[]>("/api/account/sessions"), { default: () => [] })

async function revoke(item: SessionItem) {
    const ok = await confirm({
        title: t("account.sessions.revokeTitle"),
        description: item.userAgent,
        confirmLabel: t("account.sessions.revoke"),
        destructive: true,
        action: () => api(`/api/account/sessions/${item.id}`, { method: "DELETE" }),
    })
    if (ok) await refresh()
}
</script>

<template>
    <div>
        <PageHeader :title="t('account.title')" />

        <Card>
            <CardHeader>
                <CardTitle>{{ t("account.profile") }}</CardTitle>
                <CardDescription>{{ session.user.value?.email }}</CardDescription>
            </CardHeader>
            <CardContent>
                <form
                    class="grid max-w-md gap-4"
                    @submit.prevent="saveProfile"
                >
                    <FormField
                        for="account-name"
                        :label="t('auth.name')"
                        :error="form.errors.name"
                    >
                        <Input
                            id="account-name"
                            v-model="form.values.name"
                        />
                    </FormField>
                    <div>
                        <Button
                            type="submit"
                            :disabled="form.pending.value"
                        >
                            {{ t("common.save") }}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>{{ t("account.preferences") }}</CardTitle>
            </CardHeader>
            <CardContent class="grid gap-6">
                <div class="grid gap-2">
                    <Label>{{ t("locale.choose") }}</Label>
                    <div><LocaleSwitcher /></div>
                </div>
                <div
                    v-if="userThemes"
                    class="grid gap-2"
                >
                    <Label>{{ t("theme.colour") }}</Label>
                    <ThemePicker />
                </div>
                <div class="grid gap-2">
                    <Label>{{ t("theme.mode") }}</Label>
                    <div><ThemeToggle /></div>
                </div>
                <div>
                    <Button
                        variant="outline"
                        as-child
                    >
                        <NuxtLink to="/conta/password">
                            {{ t("account.password.title") }}
                        </NuxtLink>
                    </Button>
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>{{ t("account.sessions.title") }}</CardTitle>
                <CardDescription>{{ t("account.sessions.description") }}</CardDescription>
            </CardHeader>
            <CardContent class="grid gap-3">
                <div
                    v-for="item in sessions"
                    :key="item.id"
                    class="flex items-center gap-3 rounded-md border p-3"
                >
                    <MonitorSmartphoneIcon class="size-5 shrink-0 text-muted-foreground" />
                    <div class="min-w-0 flex-1 text-sm">
                        <p class="truncate">
                            {{ item.userAgent || t("account.sessions.unknownDevice") }}
                        </p>
                        <p class="text-muted-foreground">
                            {{ item.ip }} · {{ d(new Date(item.lastSeenAt), "long") }}
                        </p>
                    </div>
                    <Badge
                        v-if="item.current"
                        variant="secondary"
                    >
                        {{ t("account.sessions.current") }}
                    </Badge>
                    <Button
                        v-else
                        variant="outline"
                        size="sm"
                        @click="revoke(item)"
                    >
                        {{ t("account.sessions.revoke") }}
                    </Button>
                </div>
            </CardContent>
        </Card>
    </div>
</template>
