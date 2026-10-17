<script setup lang="ts">
import { CheckIcon, ChevronRightIcon, SparklesIcon } from "@lucide/vue"
import type { AssistantSegment } from "#shared/utils/assistant"

// One run of reasoning and tool steps in an assistant reply. Live: open, an animated
// header and a running timer. Done: folds to "Thought for N s"; click to read it again.
const props = defineProps<{
    items: Extract<AssistantSegment, { type: "thinking" | "tool" }>[]
    active: boolean
    /** Live only: wall-clock ms when this block started. */
    since?: number
}>()
const { t, te } = useI18n()
const NBSP = String.fromCharCode(160)

// null = follow the default (open while thinking, closed once done).
const userOpen = ref<boolean | null>(null)
const open = computed(() => props.items.length > 0 && (userOpen.value ?? props.active))
watch(() => props.active, (active) => {
    if (!active) userOpen.value = null
})

const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | undefined
watch(() => props.active, (active) => {
    clearInterval(timer)
    if (active) timer = setInterval(() => (now.value = Date.now()), 250)
}, { immediate: true })
onBeforeUnmount(() => clearInterval(timer))

const seconds = computed<number | null>(() => {
    if (props.active) return props.since ? Math.max(0, Math.floor((now.value - props.since) / 1000)) : null
    const starts = props.items.map(item => item.start)
    const ends = props.items.map(item => item.end).filter((value): value is number => typeof value === "number")
    if (!starts.length || !ends.length) return null
    return Math.max(1, Math.round((Math.max(...ends) - Math.min(...starts)) / 1000))
})
const label = computed(() => props.active
    ? t("assistant.thinking.now")
    : seconds.value !== null ? t("assistant.thinking.done", { s: seconds.value }) : t("assistant.thinking.steps", { n: props.items.length }))

function toolLabel(name: string) {
    return te(`assistant.tools.${name}`) ? t(`assistant.tools.${name}`) : name
}

// Keeps the newest reasoning in view while it streams.
const body = ref<HTMLElement | null>(null)
watch(() => props.items.map(item => (item.type === "thinking" ? item.text.length : item.done ? 1 : 0)).join(), () => {
    if (props.active) {
        void nextTick(() => {
            if (body.value) body.value.scrollTop = body.value.scrollHeight
        })
    }
})
</script>

<template>
    <div class="think">
        <button
            type="button"
            class="think-head"
            :aria-expanded="open"
            :disabled="!items.length"
            @click="userOpen = !open"
        >
            <span
                v-if="active"
                class="orb"
                aria-hidden="true"
            ><i /><i /><i /></span>
            <SparklesIcon
                v-else
                class="think-icon"
            />
            <span
                v-if="active"
                class="wave"
                :aria-label="label"
            >
                <span
                    v-for="(char, index) in label"
                    :key="index"
                    aria-hidden="true"
                    :style="{ animationDelay: `${index * 0.07}s` }"
                >{{ char === " " ? NBSP : char }}</span>
            </span>
            <span v-else>{{ label }}</span>
            <span
                v-if="active && seconds !== null"
                class="think-time"
            >· {{ seconds }} s</span>
            <ChevronRightIcon
                v-if="items.length"
                class="chevron"
                :class="{ open }"
            />
        </button>
        <div
            class="think-wrap"
            :class="{ open }"
        >
            <div class="think-inner">
                <div
                    ref="body"
                    class="think-body"
                >
                    <template
                        v-for="(item, index) in items"
                        :key="index"
                    >
                        <p
                            v-if="item.type === 'thinking'"
                            class="think-text"
                        >
                            {{ item.text }}
                        </p>
                        <div
                            v-else
                            class="think-step"
                        >
                            <span class="chip">
                                <span
                                    v-if="!item.done"
                                    class="spin"
                                    aria-hidden="true"
                                />
                                <CheckIcon
                                    v-else
                                    class="check"
                                />
                                {{ toolLabel(item.name) }}
                            </span>
                        </div>
                    </template>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.think-head {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 2px 0;
    font-size: 0.8125rem;
    color: var(--muted-foreground);
    cursor: pointer;
}
.think-head:disabled { cursor: default; }
.think-head:not(:disabled):hover { color: var(--foreground); }
.think-head:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; border-radius: 4px; }
.think-icon { width: 14px; height: 14px; color: var(--primary); }
.think-time { opacity: 0.7; font-variant-numeric: tabular-nums; }
.chevron { width: 13px; height: 13px; transition: transform 0.25s ease; }
.chevron.open { transform: rotate(90deg); }

/* Three dots breathing in sequence. */
.orb { display: inline-flex; gap: 3px; }
.orb i { width: 6px; height: 6px; border-radius: 50%; background: var(--primary); animation: orb 1s ease-in-out infinite; }
.orb i:nth-child(2) { animation-delay: 0.15s; }
.orb i:nth-child(3) { animation-delay: 0.3s; }
@keyframes orb { 0%, 100% { transform: scale(0.6); opacity: 0.4; } 50% { transform: scale(1); opacity: 1; } }

/* Letters rise and brighten in a travelling wave. */
.wave span { display: inline-block; animation: wave 1.4s ease-in-out infinite; }
@keyframes wave { 0%, 100% { opacity: 0.45; transform: translateY(0); } 30% { opacity: 1; transform: translateY(-2px); color: var(--foreground); } }

/* Height animates with the 0fr -> 1fr grid trick (no fixed max-height to guess). */
.think-wrap { display: grid; grid-template-rows: 0fr; opacity: 0; transition: grid-template-rows 0.35s ease, opacity 0.3s ease; }
.think-wrap.open { grid-template-rows: 1fr; opacity: 1; }
.think-inner { overflow: hidden; min-height: 0; }
.think-body {
    margin: 6px 0 2px 3px;
    padding-left: 14px;
    border-left: 2px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 260px;
    overflow-y: auto;
}
.think-text {
    font-size: 0.84rem;
    line-height: 1.55;
    font-style: italic;
    color: var(--muted-foreground);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    animation: rise 0.35s ease both;
}
.think-step { animation: rise 0.35s ease both; }
@keyframes rise { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
.chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.72rem;
    padding: 3px 9px;
    border-radius: 999px;
    background: var(--muted);
    color: var(--foreground);
}
.check { width: 12px; height: 12px; color: var(--chart-2); }
.spin {
    width: 11px;
    height: 11px;
    border-radius: 50%;
    border: 2px solid var(--border);
    border-top-color: var(--primary);
    animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

@media (prefers-reduced-motion: reduce) {
    .orb i, .wave span, .spin, .think-text, .think-step { animation: none; }
    .think-wrap, .chevron { transition: none; }
}
</style>
