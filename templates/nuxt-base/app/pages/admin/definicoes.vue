<script setup lang="ts">
definePageMeta({ layout: "app", titleKey: "settings.title", permission: ["settings", "manage"] })

type Settings = { [K in SettingKey]: SettingValue<K> }

const { t, locales } = useI18n()
useHead({ title: () => t("settings.title") })

const api = useApi()
const notify = useNotify()
const { data: current, refresh } = await useAsyncData("admin:settings", () => api<Settings>("/api/admin/settings"))

// Local drafts per key; saved one key at a time (each save is audited).
const draft = reactive<Partial<Settings>>({})
watch(current, value => Object.assign(draft, structuredClone(toRaw(value ?? {}))), { immediate: true })

async function save<K extends SettingKey>(key: K) {
    try {
        await api(`/api/admin/settings/${key}`, { method: "PUT", body: { value: draft[key] } })
        notify.success("settings.saved")
        await refresh()
    }
    catch (error) {
        notify.error(error)
    }
}
</script>

<template>
    <div>
        <PageHeader
            :title="t('settings.title')"
            :description="t('settings.description')"
        />
        <Tabs
            v-if="current"
            default-value="security"
        >
            <TabsList>
                <TabsTrigger value="security">
                    {{ t("settings.tabs.security") }}
                </TabsTrigger>
                <TabsTrigger value="appearance">
                    {{ t("settings.tabs.appearance") }}
                </TabsTrigger>
                <TabsTrigger value="language">
                    {{ t("settings.tabs.language") }}
                </TabsTrigger>
                <TabsTrigger value="maintenance">
                    {{ t("settings.tabs.maintenance") }}
                </TabsTrigger>
            </TabsList>

            <TabsContent
                value="security"
                class="grid gap-4"
            >
                <Card>
                    <CardHeader>
                        <CardTitle>{{ t("settings.login.title") }}</CardTitle>
                        <CardDescription>{{ t("settings.login.description") }}</CardDescription>
                    </CardHeader>
                    <CardContent
                        v-if="draft['security.login']"
                        class="flex flex-wrap items-end gap-4"
                    >
                        <FormField
                            for="login-limit"
                            :label="t('settings.login.limit')"
                        >
                            <Input
                                id="login-limit"
                                v-model.number="draft['security.login'].limit"
                                type="number"
                                min="1"
                                class="w-32"
                            />
                        </FormField>
                        <FormField
                            for="login-window"
                            :label="t('settings.login.window')"
                        >
                            <Input
                                id="login-window"
                                v-model.number="draft['security.login'].windowMinutes"
                                type="number"
                                min="1"
                                class="w-32"
                            />
                        </FormField>
                        <Button @click="save('security.login')">
                            {{ t("common.save") }}
                        </Button>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>{{ t("settings.api.title") }}</CardTitle>
                        <CardDescription>{{ t("settings.api.description") }}</CardDescription>
                    </CardHeader>
                    <CardContent
                        v-if="draft['security.api']"
                        class="flex flex-wrap items-end gap-4"
                    >
                        <FormField
                            for="api-limit"
                            :label="t('settings.api.limit')"
                        >
                            <Input
                                id="api-limit"
                                v-model.number="draft['security.api'].limit"
                                type="number"
                                min="10"
                                class="w-32"
                            />
                        </FormField>
                        <FormField
                            for="api-window"
                            :label="t('settings.api.window')"
                        >
                            <Input
                                id="api-window"
                                v-model.number="draft['security.api'].windowSeconds"
                                type="number"
                                min="1"
                                class="w-32"
                            />
                        </FormField>
                        <Button @click="save('security.api')">
                            {{ t("common.save") }}
                        </Button>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent
                value="appearance"
                class="grid gap-4"
            >
                <Card>
                    <CardHeader>
                        <CardTitle>{{ t("settings.appearance.title") }}</CardTitle>
                    </CardHeader>
                    <CardContent class="grid gap-6">
                        <FormField
                            for="default-theme"
                            :label="t('settings.appearance.defaultTheme')"
                        >
                            <div class="flex flex-wrap items-center gap-2">
                                <Select v-model="draft['appearance.defaultTheme']">
                                    <SelectTrigger
                                        id="default-theme"
                                        class="w-48"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem
                                            v-for="item in THEMES"
                                            :key="item.name"
                                            :value="item.name"
                                        >
                                            {{ t(`theme.names.${item.name}`) }}
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button @click="save('appearance.defaultTheme')">
                                    {{ t("common.save") }}
                                </Button>
                            </div>
                        </FormField>
                        <label class="flex items-center gap-3 text-sm">
                            <Switch
                                v-model="draft['appearance.userThemes']"
                                @update:model-value="save('appearance.userThemes')"
                            />
                            {{ t("settings.appearance.userThemes") }}
                        </label>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="language">
                <Card>
                    <CardHeader>
                        <CardTitle>{{ t("settings.language.title") }}</CardTitle>
                        <CardDescription>{{ t("settings.language.description") }}</CardDescription>
                    </CardHeader>
                    <CardContent class="flex flex-wrap items-center gap-2">
                        <Select
                            :model-value="draft['i18n.forcedLocale'] ?? 'none'"
                            @update:model-value="value => draft['i18n.forcedLocale'] = value === 'none' ? null : value as 'pt-PT' | 'en-US'"
                        >
                            <SelectTrigger class="w-48">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">
                                    {{ t("settings.language.none") }}
                                </SelectItem>
                                <SelectItem
                                    v-for="item in locales"
                                    :key="item.code"
                                    :value="item.code"
                                >
                                    {{ item.name }}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <Button @click="save('i18n.forcedLocale')">
                            {{ t("common.save") }}
                        </Button>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="maintenance">
                <Card>
                    <CardHeader>
                        <CardTitle>{{ t("settings.maintenance.title") }}</CardTitle>
                        <CardDescription>{{ t("settings.maintenance.description") }}</CardDescription>
                    </CardHeader>
                    <CardContent class="grid gap-4">
                        <FormField
                            for="maintenance-message"
                            :label="t('settings.maintenance.message')"
                        >
                            <Textarea
                                id="maintenance-message"
                                v-model="draft['maintenance.message']"
                                rows="3"
                            />
                        </FormField>
                        <div class="flex flex-wrap items-center gap-4">
                            <Button
                                variant="outline"
                                @click="save('maintenance.message')"
                            >
                                {{ t("settings.maintenance.saveMessage") }}
                            </Button>
                            <label class="flex items-center gap-3 text-sm">
                                <Switch
                                    v-model="draft['maintenance.enabled']"
                                    @update:model-value="save('maintenance.enabled')"
                                />
                                {{ t("settings.maintenance.enabled") }}
                            </label>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    </div>
</template>
