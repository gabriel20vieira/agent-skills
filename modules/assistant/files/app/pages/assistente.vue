<script setup lang="ts">
import { BotIcon, MessagesSquareIcon, PlusIcon, SendIcon, SparklesIcon, SquareIcon, TrashIcon } from "@lucide/vue"
import type { AssistantProposal } from "#shared/utils/assistant"
import { groupSegments } from "#shared/utils/assistant"
import type { ChatEntry } from "~/composables/useAssistantChat"

definePageMeta({ layout: "app", titleKey: "assistant.title", permission: ["assistant", "read"] })

const { t } = useI18n()
useHead({ title: () => t("assistant.title") })

const MAX_CHARS = 4000
const SUGGESTIONS = ["assistant.suggestions.list", "assistant.suggestions.chart", "assistant.suggestions.propose", "assistant.suggestions.help"]

const api = useApi()
const notify = useNotify()
const confirm = useConfirm()
const { settings } = usePublicSettings()
const draft = ref("")
const drawer = ref(false)
const scroller = ref<HTMLElement | null>(null)
const composer = ref<HTMLTextAreaElement | null>(null)

const enabled = computed(() => settings.value?.["assistant.enabled"] === true)
const { data: conversations, refresh } = await useAsyncData("assistant:conversations",
    () => enabled.value ? api<{ id: number, title: string }[]>("/api/assistant/conversations") : Promise.resolve([]),
    { default: () => [] })
const chat = useAssistantChat({ onTitle: () => void refresh() })

/** Follows the newest content, unless the user scrolled up to read. */
let pinned = true
function onScroll() {
    const element = scroller.value
    if (element) pinned = element.scrollHeight - element.scrollTop - element.clientHeight < 80
}
function scrollDown(force = false) {
    void nextTick(() => {
        const element = scroller.value
        if (element && (pinned || force)) element.scrollTop = element.scrollHeight
    })
}
watch(() => chat.entries.value.map(entry => entry.segments.length + entry.content.length + entry.segments.reduce((sum, segment) => sum + (segment.type === "text" || segment.type === "thinking" ? segment.text.length : 1), 0)).join(), () => scrollDown())

function resize() {
    const element = composer.value
    if (!element) return
    element.style.height = "auto"
    element.style.height = `${Math.min(element.scrollHeight, 200)}px`
}
watch(draft, () => void nextTick(resize))

async function send(text = draft.value) {
    const message = text.trim()
    if (!message || message.length > MAX_CHARS) return
    draft.value = ""
    const isNew = !chat.conversationId.value
    pinned = true
    scrollDown(true)
    await chat.send(message)
    if (isNew) await refresh()
}

function onKeydown(event: KeyboardEvent) {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
        event.preventDefault()
        void send()
    }
}

async function open(id: number | null) {
    drawer.value = false
    if (id === null) {
        chat.reset()
        return
    }
    try {
        await chat.load(id)
        pinned = true
        scrollDown(true)
    }
    catch (error) {
        notify.error(error)
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

async function remove(id: number) {
    const ok = await confirm({
        title: t("assistant.delete.title"),
        description: t("assistant.delete.body"),
        confirmLabel: t("common.delete"),
        destructive: true,
        action: () => api(`/api/assistant/conversations/${id}`, { method: "DELETE" }),
    })
    if (!ok) return
    if (chat.conversationId.value === id) chat.reset()
    await refresh()
}

function groups(entry: ChatEntry) {
    return groupSegments(entry.segments)
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
                <Button
                    variant="outline"
                    @click="drawer = true"
                >
                    <MessagesSquareIcon /> {{ t("assistant.conversations") }}
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    :aria-label="t('assistant.new')"
                    @click="open(null)"
                >
                    <PlusIcon />
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
                ref="scroller"
                class="flex-1 overflow-y-auto rounded-lg border"
                aria-live="polite"
                @scroll.passive="onScroll"
            >
                <div class="mx-auto flex max-w-3xl flex-col gap-5 p-4">
                    <div
                        v-if="!chat.entries.value.length"
                        class="flex flex-col items-center gap-4 py-12 text-center"
                    >
                        <div class="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <SparklesIcon class="size-6" />
                        </div>
                        <div class="space-y-1">
                            <p class="font-semibold">
                                {{ t("assistant.welcome") }}
                            </p>
                            <p class="max-w-md text-sm text-muted-foreground">
                                {{ t("assistant.hint") }}
                            </p>
                        </div>
                        <div class="flex max-w-xl flex-wrap justify-center gap-2">
                            <Button
                                v-for="key in SUGGESTIONS"
                                :key="key"
                                variant="outline"
                                size="sm"
                                class="h-auto rounded-full py-1.5 whitespace-normal"
                                @click="send(t(key))"
                            >
                                {{ t(key) }}
                            </Button>
                        </div>
                    </div>

                    <template
                        v-for="entry in chat.entries.value"
                        :key="entry.key"
                    >
                        <div
                            v-if="entry.role === 'user'"
                            class="ml-auto max-w-[85%] rounded-[14px_14px_4px_14px] bg-primary px-3.5 py-2 text-sm whitespace-pre-wrap text-primary-foreground"
                        >
                            {{ entry.content }}
                        </div>
                        <div
                            v-else
                            class="flex max-w-full flex-col gap-2.5"
                        >
                            <AssistantThinkingBlock
                                v-if="entry.streaming && !entry.segments.length"
                                :items="[]"
                                :active="true"
                                :since="entry.sentAt"
                            />
                            <template
                                v-for="(group, index) in groups(entry)"
                                :key="index"
                            >
                                <AssistantThinkingBlock
                                    v-if="group.kind === 'think'"
                                    :items="group.items"
                                    :active="!!entry.streaming && index === groups(entry).length - 1"
                                    :since="entry.sentAt !== undefined ? entry.sentAt + group.items[0]!.start : undefined"
                                />
                                <AssistantMarkdown
                                    v-else-if="group.segment.type === 'text'"
                                    :text="group.segment.text"
                                />
                                <AssistantChartCard
                                    v-else-if="group.segment.type === 'chart'"
                                    :chart="group.segment.chart"
                                />
                                <AssistantProposalCard
                                    v-else-if="chat.proposals.value[group.segment.id]"
                                    :proposal="chat.proposals.value[group.segment.id]!"
                                    @accept="accept"
                                    @reject="reject"
                                />
                            </template>
                        </div>
                    </template>

                    <Alert
                        v-if="chat.error.value"
                        variant="destructive"
                    >
                        <AlertDescription>{{ chat.error.value }}</AlertDescription>
                    </Alert>
                </div>
            </div>

            <form
                class="mx-auto flex w-full max-w-3xl items-end gap-2"
                @submit.prevent="send()"
            >
                <div class="relative flex-1">
                    <textarea
                        ref="composer"
                        v-model="draft"
                        rows="1"
                        :maxlength="MAX_CHARS"
                        class="block max-h-50 min-h-10 w-full resize-none rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        :placeholder="t('assistant.placeholder')"
                        :aria-label="t('assistant.placeholder')"
                        @keydown="onKeydown"
                    />
                    <span
                        v-if="draft.length > MAX_CHARS * 0.9"
                        class="absolute right-2 bottom-1 text-[10px] text-muted-foreground tabular-nums"
                    >{{ draft.length }}/{{ MAX_CHARS }}</span>
                </div>
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

        <Sheet v-model:open="drawer">
            <SheetContent
                side="right"
                class="w-80 gap-0"
            >
                <SheetHeader>
                    <SheetTitle>{{ t("assistant.conversations") }}</SheetTitle>
                </SheetHeader>
                <div class="flex flex-col gap-1 overflow-y-auto px-3 pb-4">
                    <Button
                        variant="ghost"
                        class="justify-start"
                        @click="open(null)"
                    >
                        <PlusIcon /> {{ t("assistant.new") }}
                    </Button>
                    <p
                        v-if="!conversations.length"
                        class="px-3 py-2 text-sm text-muted-foreground"
                    >
                        {{ t("assistant.noConversations") }}
                    </p>
                    <div
                        v-for="item in conversations"
                        :key="item.id"
                        class="group flex items-center gap-1 rounded-md hover:bg-muted"
                        :class="{ 'bg-muted': item.id === chat.conversationId.value }"
                    >
                        <button
                            type="button"
                            class="min-w-0 flex-1 truncate px-3 py-2 text-left text-sm"
                            @click="open(item.id)"
                        >
                            {{ item.title }}
                        </button>
                        <Button
                            variant="ghost"
                            size="icon"
                            class="size-8 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                            :aria-label="t('common.delete')"
                            @click="remove(item.id)"
                        >
                            <TrashIcon />
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    </div>
</template>
