<script setup lang="ts">
import { ChevronsUpDownIcon, EyeIcon, KeyRoundIcon, LogOutIcon, UserIcon } from "@lucide/vue"

const { t } = useI18n()
const session = useSession()
const api = useApi()
const notify = useNotify()

const initials = computed(() => (session.user.value?.name ?? "?")
    .split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]!.toUpperCase()).join(""))
const realAdmin = computed(() => !!session.user.value?.roles.includes("admin"))

async function viewAs(role: Role) {
    try {
        session.user.value = await api<AuthUser>("/api/auth/mimic", { method: "POST", body: { roles: [role] } })
        await navigateTo("/app")
    }
    catch (error) {
        notify.error(error)
    }
}
</script>

<template>
    <SidebarMenu v-if="session.user.value">
        <SidebarMenuItem>
            <DropdownMenu>
                <DropdownMenuTrigger as-child>
                    <SidebarMenuButton size="lg">
                        <Avatar class="size-8 rounded-lg">
                            <AvatarFallback class="rounded-lg">
                                {{ initials }}
                            </AvatarFallback>
                        </Avatar>
                        <div class="grid flex-1 text-left text-sm leading-tight">
                            <span class="truncate font-medium">{{ session.user.value.name }}</span>
                            <span class="truncate text-xs text-muted-foreground">{{ session.user.value.email }}</span>
                        </div>
                        <ChevronsUpDownIcon class="ml-auto size-4" />
                    </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    side="top"
                    align="start"
                    class="w-(--reka-dropdown-menu-trigger-width) min-w-56"
                >
                    <DropdownMenuItem as-child>
                        <NuxtLink to="/conta">
                            <UserIcon /> {{ t("nav.account") }}
                        </NuxtLink>
                    </DropdownMenuItem>
                    <DropdownMenuItem as-child>
                        <NuxtLink to="/conta/password">
                            <KeyRoundIcon /> {{ t("account.password.title") }}
                        </NuxtLink>
                    </DropdownMenuItem>
                    <template v-if="realAdmin && !session.user.value.mimicking">
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel class="flex items-center gap-2 text-xs text-muted-foreground">
                            <EyeIcon class="size-3.5" /> {{ t("mimic.viewAs") }}
                        </DropdownMenuLabel>
                        <DropdownMenuItem
                            v-for="role in ROLES.filter(role => role !== 'admin')"
                            :key="role"
                            @select="viewAs(role)"
                        >
                            {{ t(`roles.${role}`) }}
                        </DropdownMenuItem>
                    </template>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem @select="session.logout()">
                        <LogOutIcon /> {{ t("auth.signOut") }}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </SidebarMenuItem>
    </SidebarMenu>
</template>
