<script setup lang="ts">
// The assistant tab of /admin/definicoes. Each field saves through the settings API
// (audited, and pushed to open tabs as settings.updated).
const { t } = useI18n()
const api = useApi()
const notify = useNotify()

type Values = {
    "assistant.enabled": boolean
    "assistant.provider": "ollama" | "fake"
    "assistant.baseUrl": string
    "assistant.model": string
    "assistant.systemPrompt": string
}

const { data, refresh } = await useAsyncData("admin:assistant-settings", () => api<Values>("/api/admin/settings"))
const draft = reactive({} as Values)
watch(data, value => Object.assign(draft, structuredClone(toRaw(value ?? {}))), { immediate: true })

async function save<K extends keyof Values>(key: K) {
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
    <Card>
        <CardHeader>
            <CardTitle>{{ t("assistant.settings.title") }}</CardTitle>
            <CardDescription>{{ t("assistant.settings.description") }}</CardDescription>
        </CardHeader>
        <CardContent class="grid gap-5">
            <label class="flex items-center gap-3 text-sm">
                <Switch
                    v-model="draft['assistant.enabled']"
                    @update:model-value="save('assistant.enabled')"
                />
                {{ t("assistant.settings.enabled") }}
            </label>
            <FormField
                for="assistant-provider"
                :label="t('assistant.settings.provider')"
            >
                <div class="flex gap-2">
                    <Select v-model="draft['assistant.provider']">
                        <SelectTrigger
                            id="assistant-provider"
                            class="w-48"
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ollama">
                                Ollama
                            </SelectItem>
                            <SelectItem value="fake">
                                {{ t("assistant.settings.fake") }}
                            </SelectItem>
                        </SelectContent>
                    </Select>
                    <Button @click="save('assistant.provider')">
                        {{ t("common.save") }}
                    </Button>
                </div>
            </FormField>
            <FormField
                for="assistant-base-url"
                :label="t('assistant.settings.baseUrl')"
            >
                <div class="flex gap-2">
                    <Input
                        id="assistant-base-url"
                        v-model="draft['assistant.baseUrl']"
                    />
                    <Button @click="save('assistant.baseUrl')">
                        {{ t("common.save") }}
                    </Button>
                </div>
            </FormField>
            <FormField
                for="assistant-model"
                :label="t('assistant.settings.model')"
            >
                <div class="flex gap-2">
                    <Input
                        id="assistant-model"
                        v-model="draft['assistant.model']"
                    />
                    <Button @click="save('assistant.model')">
                        {{ t("common.save") }}
                    </Button>
                </div>
            </FormField>
            <FormField
                for="assistant-prompt"
                :label="t('assistant.settings.systemPrompt')"
                :hint="t('assistant.settings.systemPromptHint')"
            >
                <Textarea
                    id="assistant-prompt"
                    v-model="draft['assistant.systemPrompt']"
                    rows="4"
                />
            </FormField>
            <div>
                <Button @click="save('assistant.systemPrompt')">
                    {{ t("common.save") }}
                </Button>
            </div>
        </CardContent>
    </Card>
</template>
