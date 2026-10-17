<script setup lang="ts">
import DOMPurify from "dompurify"
import { marked } from "marked"

// Assistant answers are Markdown. The HTML is sanitised with DOMPurify, which needs the
// DOM, so it renders in the browser only; during SSR the text shows as plain text.
const props = defineProps<{ text: string }>()

const html = computed(() => {
    if (!import.meta.client || !props.text) return ""
    return DOMPurify.sanitize(marked.parse(props.text, { async: false, breaks: true, gfm: true }) as string)
})
</script>

<template>
    <!-- Sanitised above with DOMPurify. -->
    <!-- eslint-disable vue/no-v-html -->
    <div
        v-if="html"
        class="assistant-md"
        v-html="html"
    />
    <!-- eslint-enable vue/no-v-html -->
    <div
        v-else
        class="assistant-md whitespace-pre-wrap"
    >
        {{ text }}
    </div>
</template>

<style scoped>
.assistant-md {
    font-size: 0.875rem;
    line-height: 1.6;
    overflow-wrap: anywhere;
}
.assistant-md :deep(> * + *) { margin-top: 0.6em; }
.assistant-md :deep(h1), .assistant-md :deep(h2), .assistant-md :deep(h3) { font-weight: 600; line-height: 1.3; }
.assistant-md :deep(h1) { font-size: 1.15rem; }
.assistant-md :deep(h2) { font-size: 1.05rem; }
.assistant-md :deep(h3) { font-size: 0.95rem; }
.assistant-md :deep(ul) { list-style: disc; padding-left: 1.25rem; }
.assistant-md :deep(ol) { list-style: decimal; padding-left: 1.25rem; }
.assistant-md :deep(li + li) { margin-top: 0.2em; }
.assistant-md :deep(a) { color: var(--primary); text-decoration: underline; text-underline-offset: 2px; }
.assistant-md :deep(strong) { font-weight: 600; }
.assistant-md :deep(code) { font-family: var(--font-mono, ui-monospace, monospace); font-size: 0.85em; background: var(--muted); border-radius: 4px; padding: 0.1em 0.35em; }
.assistant-md :deep(pre) { background: var(--muted); border-radius: 8px; padding: 0.75rem; overflow-x: auto; }
.assistant-md :deep(pre code) { background: none; padding: 0; }
.assistant-md :deep(blockquote) { border-left: 3px solid var(--border); padding-left: 0.75rem; color: var(--muted-foreground); }
.assistant-md :deep(table) { border-collapse: collapse; display: block; overflow-x: auto; }
.assistant-md :deep(th), .assistant-md :deep(td) { border: 1px solid var(--border); padding: 0.3rem 0.6rem; text-align: left; }
.assistant-md :deep(th) { background: var(--muted); font-weight: 600; }
</style>
