<script setup lang="ts">
// The foundation only sets essential cookies (session, language, theme), which need no
// consent; this is a notice, not a consent banner. Adding analytics or ads means turning
// it into real opt-in consent before those scripts load.
const { t } = useI18n()
const seen = useCookie<string | null>("cookie-notice", { maxAge: 60 * 60 * 24 * 365, sameSite: "lax" })
</script>

<template>
    <div
        v-if="!seen"
        role="region"
        :aria-label="t('cookies.label')"
        class="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-xl flex-col gap-3 rounded-lg border bg-background p-4 text-sm shadow-lg sm:flex-row sm:items-center"
    >
        <p class="flex-1 text-muted-foreground">
            {{ t("cookies.notice") }}
            <NuxtLink
                to="/privacidade"
                class="underline underline-offset-4 hover:text-foreground"
            >
                {{ t("cookies.more") }}
            </NuxtLink>
        </p>
        <Button
            size="sm"
            @click="seen = '1'"
        >
            {{ t("cookies.ok") }}
        </Button>
    </div>
</template>
