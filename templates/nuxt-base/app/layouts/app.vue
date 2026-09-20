<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const title = computed(() => (route.meta.titleKey ? t(route.meta.titleKey) : ""))
</script>

<template>
    <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
            <MimicBanner />
            <header class="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur">
                <!-- Only on mobile: on desktop the trigger is in the sidebar itself. -->
                <SidebarTrigger class="-ml-1 md:hidden" />
                <Separator
                    orientation="vertical"
                    class="mr-1 h-4 md:hidden"
                />
                <span class="truncate text-sm font-medium">{{ title }}</span>
                <div class="ml-auto flex items-center gap-1">
                    <RealtimeIndicator class="mr-2" />
                    <LocaleSwitcher />
                    <ThemeToggle />
                </div>
            </header>
            <div class="mx-auto w-full max-w-6xl flex-1 space-y-6 p-4 md:p-6">
                <slot />
            </div>
        </SidebarInset>
    </SidebarProvider>
</template>
