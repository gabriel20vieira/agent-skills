<script setup lang="ts">
const props = defineProps<{ resource: Resource, action: Action }>()
const allowed = useCan()
</script>

<template>
    <slot v-if="allowed(props.resource, props.action)" />
    <slot
        v-else
        name="denied"
    />
</template>
