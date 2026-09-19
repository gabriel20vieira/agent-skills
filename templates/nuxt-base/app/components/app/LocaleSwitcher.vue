<script setup lang="ts">
import { LanguagesIcon } from "@lucide/vue"

const { t, locale, locales, setLocale } = useI18n()
const session = useSession()
const api = useApi()

async function choose(code: typeof locale.value) {
    await setLocale(code)
    // Signed-in users keep the choice across devices.
    if (session.user.value) {
        session.user.value = await api<AuthUser>("/api/account", { method: "PATCH", body: { locale: code } }).catch(() => session.user.value)
    }
}
</script>

<template>
    <DropdownMenu>
        <DropdownMenuTrigger as-child>
            <Button
                variant="ghost"
                size="icon"
                :aria-label="t('locale.choose')"
            >
                <LanguagesIcon />
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
            <DropdownMenuItem
                v-for="item in locales"
                :key="item.code"
                :class="item.code === locale ? 'font-medium' : ''"
                @select="choose(item.code)"
            >
                {{ item.name }}
            </DropdownMenuItem>
        </DropdownMenuContent>
    </DropdownMenu>
</template>
