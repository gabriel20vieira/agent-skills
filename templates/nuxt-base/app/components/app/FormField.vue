<script setup lang="ts">
defineProps<{ label: string, for: string, error?: string, hint?: string }>()
</script>

<template>
    <div class="grid gap-2">
        <Label :for="$props.for">{{ label }}</Label>
        <slot />
        <p
            v-if="error"
            :id="`${$props.for}-error`"
            class="text-sm text-danger"
        >
            {{ error }}
        </p>
        <p
            v-else-if="hint"
            class="text-sm text-muted-foreground"
        >
            {{ hint }}
        </p>
    </div>
</template>
