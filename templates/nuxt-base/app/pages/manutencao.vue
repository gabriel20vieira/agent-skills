<script setup lang="ts">
definePageMeta({ layout: "auth", auth: false })

const { t } = useI18n()
useHead({ title: () => t("maintenance.title") })

const { settings } = usePublicSettings()
const message = computed(() => settings.value?.["maintenance.message"] || t("maintenance.body"))
</script>

<template>
    <Card>
        <CardHeader>
            <CardTitle>{{ t("maintenance.title") }}</CardTitle>
            <CardDescription>{{ message }}</CardDescription>
        </CardHeader>
    </Card>
</template>
