<script setup lang="ts">
const { t } = useI18n()
const config = useRuntimeConfig()
const { loggedIn } = useSession()
</script>

<template>
    <div class="flex min-h-dvh flex-col">
        <header class="border-b">
            <div class="mx-auto flex h-14 w-full max-w-5xl items-center gap-2 px-4">
                <NuxtLink
                    to="/"
                    class="font-semibold tracking-tight"
                >
                    {{ config.public.appName }}
                </NuxtLink>
                <div class="ml-auto flex items-center gap-1">
                    <LocaleSwitcher />
                    <ThemeToggle />
                    <Button
                        as-child
                        size="sm"
                        class="ml-2"
                    >
                        <NuxtLink :to="loggedIn ? '/app' : '/entrar'">
                            {{ loggedIn ? t("nav.openApp") : t("auth.signIn.title") }}
                        </NuxtLink>
                    </Button>
                </div>
            </div>
        </header>
        <main class="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
            <slot />
        </main>
        <footer class="border-t">
            <div class="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 text-sm text-muted-foreground">
                <span>© {{ new Date().getFullYear() }} {{ config.public.appName }}</span>
                <NuxtLink
                    to="/privacidade"
                    class="hover:text-foreground"
                >
                    {{ t("privacy.title") }}
                </NuxtLink>
            </div>
        </footer>
    </div>
</template>
