<script setup lang="ts">
import { BotIcon, PlusIcon, SendIcon, SquareIcon, TrashIcon } from "@lucide/vue"
import type { AssistantProposal } from "#shared/utils/assistant"

definePageMeta({ layout: "app", titleKey: "assistant.title", permission: ["assistant", "read"] })

const { t } = useI18n()
useHead({ title: () => t("assistant.title") })

const api = useApi()
const notify = useNotify()
const confirm = useConfirm()
const { settings } = usePublicSettings()
const chat = useAssistantChat()
const draft = ref("")

const enabled = computed(() => settings.value?.["assistant.enabled"] === true)
const { data: conversations, refresh } = await useAsyncData("assistant:conversations",
    () => enabled.value ? api<{ id: number, title: string }[]>("/api/assistant/conversations") : Promise.resolve([]),
    { default: () => [] })

const selected = computed({
    get: () => (chat.conversationId.value ? String(chat.conversationId.value) : "new"),
    set: (value: string) => {
        if (value === "new") chat.reset()
        else void chat.load(Number(value)).catch(error => notify.error(error))
    },
})

async function send() {
    const text = draft.value.trim()
    if (!text) return
    draft.value = ""
    const isNew = !chat.conversationId.value
    await chat.send(text)
    if (isNew) await refresh()
}

function onKeydown(event: KeyboardEvent) {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault()
        void send()
    }
}

async function accept(proposal: AssistantProposal) {
    try {
        notify.success(await chat.accept(proposal))
    }
    catch (error) {
        notify.error(error)
    }
}

async function reject(proposal: AssistantProposal) {
    try {
        await chat.reject(proposal)
    }
    catch (error) {
        notify.error(error)
    }
}

async function remove() {
    const id = chat.conversationId.value
    if (!id) return
    const ok = await confirm({
        title: t("assistant.delete.title"),
        description: t("assistant.delete.body"),
        confirmLabel: t("common.delete"),
        destructive: true,
        action: () => api(`/api/assistant/conversations/${id}`, { method: "DELETE" }),
    })
    if (!ok) return
    chat.reset()
    await refresh()
}
</script>

<template>
    <div class="flex h-[calc(100dvh-8rem)] flex-col gap-4">
        <PageHeader
            :title="t('assistant.title')"
            :description="t('assistant.description')"
        >
            <template
                v-if="enabled"
                #actions
            >
                <Select v-model="selected">
                    <SelectTrigger
                        class="w-56"
                        :aria-label="t('assistant.conversations')"
                    >
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="new">
                            {{ t("assistant.new") }}
                        </SelectItem>
                        <SelectItem
                            v-for="item in conversations"
                            :key="item.id"
                            :value="String(item.id)"
                        >
                            {{ item.title }}
                        </SelectItem>
                    </SelectContent>
                </Select>
                <Button
                    variant="outline"
                    size="icon"
                    :aria-label="t('assistant.new')"
                    @click="selected = 'new'"
                >
                    <PlusIcon />
                </Button>
                <Button
                    v-if="chat.conversationId.value"
                    variant="ghost"
                    size="icon"
                    :aria-label="t('common.delete')"
                    @click="remove"
                >
                    <TrashIcon />
                </Button>
            </template>
        </PageHeader>

        <EmptyState
            v-if="!enabled"
            :icon="BotIcon"
            :title="t('assistant.disabled.title')"
            :description="t('assistant.disabled.body')"
        />

        <template v-else>
            <div
                class="flex-1 space-y-4 overflow-y-auto rounded-lg border p-4"
                aria-live="polite"
            >
                <p
                    v-if="!chat.lines.value.length"
                    class="text-sm text-muted-foreground"
                >
                    {{ t("assistant.hint") }}
                </p>
                <div
                    v-for="line in chat.lines.value"
                    :key="line.key"
                    class="flex"
                    :class="line.role === 'user' ? 'justify-end' : 'justify-start'"
                >
                    <div
                        class="max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm"
                        :class="line.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'"
                    >
                        {{ line.content || "…" }}
                    </div>
                </div>
                <AssistantProposalCard
                    v-for="proposal in chat.proposals.value"
                    :key="proposal.id"
                    :proposal="proposal"
                    @accept="accept"
                    @reject="reject"
                />
                <p
                    v-if="chat.activeTool.value"
                    class="text-xs text-muted-foreground"
                >
                    {{ t("assistant.usingTool", { tool: chat.activeTool.value }) }}
                </p>
                <Alert
                    v-if="chat.error.value"
                    variant="destructive"
                >
                    <AlertDescription>{{ chat.error.value }}</AlertDescription>
                </Alert>
            </div>

            <form
                class="flex items-end gap-2"
                @submit.prevent="send"
            >
                <Textarea
                    v-model="draft"
                    rows="2"
                    class="min-h-0 flex-1 resize-none"
                    :placeholder="t('assistant.placeholder')"
                    :aria-label="t('assistant.placeholder')"
                    @keydown="onKeydown"
                />
                <Button
                    v-if="chat.streaming.value"
                    type="button"
                    variant="outline"
                    size="icon"
                    :aria-label="t('assistant.stop')"
                    @click="chat.stop()"
                >
                    <SquareIcon />
                </Button>
                <Button
                    v-else
                    type="submit"
                    size="icon"
                    :disabled="!draft.trim()"
                    :aria-label="t('assistant.send')"
                >
                    <SendIcon />
                </Button>
            </form>
        </template>
    </div>
</template>
