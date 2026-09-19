<script setup lang="ts">
import type { Component } from "vue"

defineProps<{ label: string, value: string | number, hint?: string, icon?: Component }>()
</script>

<template>
    <Card>
        <CardHeader class="flex flex-row items-center justify-between gap-2 pb-2">
            <CardDescription>{{ label }}</CardDescription>
            <component
                :is="icon"
                v-if="icon"
                class="size-4 text-muted-foreground"
            />
        </CardHeader>
        <CardContent>
            <p class="text-2xl font-semibold tabular-nums">
                {{ value }}
            </p>
            <p
                v-if="hint"
                class="text-xs text-muted-foreground"
            >
                {{ hint }}
            </p>
        </CardContent>
    </Card>
</template>
