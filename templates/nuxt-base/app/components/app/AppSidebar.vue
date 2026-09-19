<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const config = useRuntimeConfig()
const navigation = useNavigation()

function active(to: string) {
    return to === "/app" ? route.path === to : route.path === to || route.path.startsWith(`${to}/`)
}
</script>

<template>
    <Sidebar collapsible="icon">
        <SidebarHeader>
            <NuxtLink
                to="/app"
                class="flex h-8 items-center px-2 font-semibold tracking-tight group-data-[collapsible=icon]:hidden"
            >
                {{ config.public.appName }}
            </NuxtLink>
        </SidebarHeader>
        <SidebarContent>
            <SidebarGroup
                v-for="group in navigation"
                :key="group.labelKey"
            >
                <SidebarGroupLabel>{{ t(group.labelKey) }}</SidebarGroupLabel>
                <SidebarMenu>
                    <SidebarMenuItem
                        v-for="item in group.items"
                        :key="item.to"
                    >
                        <SidebarMenuButton
                            as-child
                            :is-active="active(item.to)"
                            :tooltip="t(item.labelKey)"
                        >
                            <NuxtLink :to="item.to">
                                <component :is="item.icon" />
                                <span>{{ t(item.labelKey) }}</span>
                            </NuxtLink>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
            <UserMenu />
        </SidebarFooter>
    </Sidebar>
</template>
