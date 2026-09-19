<script setup lang="ts">
import type { NuxtError } from "#app"

const props = defineProps<{ error: NuxtError }>()
const { t, te } = useI18n()

const status = computed(() => props.error.statusCode ?? 500)
const key = computed(() => (te(`errorPage.${status.value}.title`) ? String(status.value) : "500"))
useHead({ title: () => t(`errorPage.${key.value}.title`) })
</script>

<template>
    <NuxtLayout name="auth">
        <Card>
            <CardHeader>
                <p class="text-sm font-medium text-muted-foreground">
                    {{ status }}
                </p>
                <CardTitle>{{ t(`errorPage.${key}.title`) }}</CardTitle>
                <CardDescription>{{ t(`errorPage.${key}.body`) }}</CardDescription>
            </CardHeader>
            <CardFooter>
                <Button @click="clearError({ redirect: '/' })">
                    {{ t("errorPage.home") }}
                </Button>
            </CardFooter>
        </Card>
    </NuxtLayout>
</template>
