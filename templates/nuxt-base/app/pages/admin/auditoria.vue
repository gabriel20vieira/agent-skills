<script setup lang="ts">
definePageMeta({ layout: "app", titleKey: "audit.title", permission: ["audit", "read"] })

interface AuditItem {
    id: number
    action: string
    resource: string
    resourceId: string | null
    meta: Record<string, unknown> | null
    ip: string | null
    createdAt: string
    userName: string | null
}

const { t, d } = useI18n()
useHead({ title: () => t("audit.title") })

const api = useApi()
const query = reactive({ page: 1, size: 25, action: "" })

// Server mode: the API paginates; DataTable only renders the page it is given.
const { data, pending } = await useAsyncData(
    "admin:audit",
    () => api<{ items: AuditItem[], total: number }>("/api/admin/audit", {
        query: { page: query.page, size: query.size, action: query.action || undefined },
    }),
    { watch: [query], default: () => ({ items: [], total: 0 }) },
)

const columns = computed(() => [
    { key: "createdAt", label: t("audit.when") },
    { key: "userName", label: t("audit.who") },
    { key: "action", label: t("audit.action") },
    { key: "resourceId", label: t("audit.target"), class: "hidden md:table-cell" },
    { key: "ip", label: "IP", class: "hidden lg:table-cell" },
])

function onQuery(next: { page: number, search: string }) {
    query.page = next.page
    query.action = next.search.trim()
}
</script>

<template>
    <div>
        <PageHeader
            :title="t('audit.title')"
            :description="t('audit.description')"
        />
        <DataTable
            :rows="data.items"
            :columns="columns"
            :total="data.total"
            :page-size="query.size"
            :loading="pending"
            @update:query="onQuery"
        >
            <template #cell-createdAt="{ row }">
                {{ d(new Date(row.createdAt), "long") }}
            </template>
            <template #cell-userName="{ row }">
                {{ row.userName ?? "—" }}
            </template>
            <template #cell-action="{ row }">
                <code class="text-xs">{{ row.action }}</code>
            </template>
            <template #cell-resourceId="{ row }">
                {{ row.resource }}{{ row.resourceId ? ` #${row.resourceId}` : "" }}
            </template>
        </DataTable>
    </div>
</template>
