<script setup lang="ts">
import { Building2Icon, CheckIcon, ChevronsUpDownIcon, SettingsIcon } from "@lucide/vue"

const { t } = useI18n()
const notify = useNotify()
const { state, organizations, active, refresh, switchTo } = useOrganizations()

await callOnce("orgs", refresh)
// Added to or removed from an organisation elsewhere: reload the list.
useRealtimeEvent("organizations.changed", () => void refresh())

async function pick(id: number) {
    if (id === active.value?.id) return
    try {
        await switchTo(id)
    }
    catch (error) {
        notify.error(error)
    }
}
</script>

<template>
    <SidebarMenu v-if="state">
        <SidebarMenuItem>
            <DropdownMenu>
                <DropdownMenuTrigger as-child>
                    <SidebarMenuButton size="lg">
                        <div class="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                            <Building2Icon class="size-4" />
                        </div>
                        <div class="grid flex-1 text-left text-sm leading-tight">
                            <span class="truncate font-medium">{{ active?.name ?? t("orgs.none") }}</span>
                            <span
                                v-if="active"
                                class="truncate text-xs text-muted-foreground"
                            >{{ t(`orgs.roles.${active.role}`) }}</span>
                        </div>
                        <ChevronsUpDownIcon class="ml-auto size-4" />
                    </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align="start"
                    class="w-(--reka-dropdown-menu-trigger-width) min-w-56"
                >
                    <DropdownMenuLabel class="text-xs text-muted-foreground">
                        {{ t("orgs.title") }}
                    </DropdownMenuLabel>
                    <DropdownMenuItem
                        v-for="org in organizations"
                        :key="org.id"
                        @select="pick(org.id)"
                    >
                        <span class="truncate">{{ org.name }}</span>
                        <CheckIcon
                            v-if="org.id === active?.id"
                            class="ml-auto"
                        />
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem as-child>
                        <NuxtLink to="/app/organizacoes">
                            <SettingsIcon /> {{ t("orgs.manage") }}
                        </NuxtLink>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </SidebarMenuItem>
    </SidebarMenu>
</template>
