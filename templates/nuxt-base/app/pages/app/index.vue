<script setup lang="ts">
import { NotebookPenIcon, UsersIcon } from "@lucide/vue"

definePageMeta({ layout: "app", titleKey: "dashboard.title" })

const { t } = useI18n()
useHead({ title: () => t("dashboard.title") })

const session = useSession()
const allowed = useCan()
const api = useApi()

const { data: notes } = await useAsyncData("dashboard:notes", () =>
    allowed("notes", "read") ? api<unknown[]>("/api/notes") : Promise.resolve([]))
const { data: users } = await useAsyncData("dashboard:users", () =>
    allowed("users", "read") ? api<unknown[]>("/api/admin/users") : Promise.resolve(null))
</script>

<template>
    <div>
        <PageHeader
            :title="t('dashboard.welcome', { name: session.user.value?.name ?? '' })"
            :description="t('dashboard.subtitle')"
        />
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
                v-if="allowed('notes', 'read')"
                :label="t('nav.notes')"
                :value="notes?.length ?? 0"
                :icon="NotebookPenIcon"
            />
            <StatCard
                v-if="users"
                :label="t('nav.users')"
                :value="users.length"
                :icon="UsersIcon"
            />
        </div>
    </div>
</template>
