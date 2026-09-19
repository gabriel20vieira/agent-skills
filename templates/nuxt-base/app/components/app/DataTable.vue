<script setup lang="ts" generic="T extends { id: string | number }">
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, SearchIcon } from "@lucide/vue"
import type { SortDirection } from "~/utils/table"

export interface DataTableColumn {
    key: string
    label: string
    sortable?: boolean
    class?: string
}

export interface DataTableQuery {
    search: string
    sort: { key: string, dir: SortDirection } | null
    page: number
    size: number
}

const props = withDefaults(defineProps<{
    rows: T[]
    columns: DataTableColumn[]
    /** Keys searched in client mode; the search box is hidden without them. */
    searchKeys?: string[]
    pageSize?: number
    loading?: boolean
    /** Server mode: rows are one page already; emit update:query and show this total. */
    total?: number
}>(), { searchKeys: () => [], pageSize: 10, loading: false, total: undefined })

const emit = defineEmits<{ "update:query": [DataTableQuery] }>()
const { t } = useI18n()

const query = reactive<DataTableQuery>({ search: "", sort: null, page: 1, size: props.pageSize })
const serverMode = computed(() => props.total !== undefined)

const view = computed(() => serverMode.value
    ? {
            rows: props.rows,
            total: props.total!,
            page: query.page,
            pages: Math.max(1, Math.ceil(props.total! / query.size)),
        }
    : queryRows(props.rows, { ...query, searchKeys: props.searchKeys }))

watch(() => [query.search, query.size], () => {
    query.page = 1
})
watch(query, value => emit("update:query", { ...value }), { deep: true })

function toggleSort(column: DataTableColumn) {
    if (!column.sortable) return
    if (query.sort?.key !== column.key) query.sort = { key: column.key, dir: "asc" }
    else if (query.sort.dir === "asc") query.sort = { key: column.key, dir: "desc" }
    else query.sort = null
}

function sortIcon(column: DataTableColumn) {
    if (query.sort?.key !== column.key) return ArrowUpDownIcon
    return query.sort.dir === "asc" ? ArrowUpIcon : ArrowDownIcon
}
</script>

<template>
    <div class="space-y-3">
        <div
            v-if="searchKeys.length || serverMode"
            class="relative max-w-sm"
        >
            <SearchIcon class="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
                v-model="query.search"
                class="pl-8"
                :placeholder="t('table.search')"
                :aria-label="t('table.search')"
            />
        </div>

        <div class="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead
                            v-for="column in columns"
                            :key="column.key"
                            :class="column.class"
                            :aria-sort="query.sort?.key === column.key ? (query.sort.dir === 'asc' ? 'ascending' : 'descending') : undefined"
                        >
                            <button
                                v-if="column.sortable"
                                type="button"
                                class="inline-flex items-center gap-1 hover:text-foreground"
                                @click="toggleSort(column)"
                            >
                                {{ column.label }}
                                <component
                                    :is="sortIcon(column)"
                                    class="size-3.5"
                                />
                            </button>
                            <template v-else>
                                {{ column.label }}
                            </template>
                        </TableHead>
                        <TableHead
                            v-if="$slots['row-actions']"
                            class="w-0"
                        >
                            <span class="sr-only">{{ t("table.actions") }}</span>
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <template v-if="loading && !view.rows.length">
                        <TableRow
                            v-for="index in 3"
                            :key="`skeleton-${index}`"
                        >
                            <TableCell :colspan="columns.length + ($slots['row-actions'] ? 1 : 0)">
                                <Skeleton class="h-5 w-full" />
                            </TableCell>
                        </TableRow>
                    </template>
                    <TableRow
                        v-for="row in view.rows"
                        v-else-if="view.rows.length"
                        :key="row.id"
                    >
                        <TableCell
                            v-for="column in columns"
                            :key="column.key"
                            :class="column.class"
                        >
                            <slot
                                :name="`cell-${column.key}`"
                                :row="row"
                            >
                                {{ (row as Record<string, unknown>)[column.key] }}
                            </slot>
                        </TableCell>
                        <TableCell
                            v-if="$slots['row-actions']"
                            class="text-right"
                        >
                            <slot
                                name="row-actions"
                                :row="row"
                            />
                        </TableCell>
                    </TableRow>
                    <TableRow v-else>
                        <TableCell
                            :colspan="columns.length + ($slots['row-actions'] ? 1 : 0)"
                            class="h-24 whitespace-normal text-center text-muted-foreground"
                        >
                            <slot name="empty">
                                {{ t("table.empty") }}
                            </slot>
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </div>

        <div
            v-if="view.pages > 1"
            class="flex items-center justify-between gap-2 text-sm text-muted-foreground"
        >
            <span>{{ t("table.pageOf", { page: view.page, pages: view.pages, total: view.total }) }}</span>
            <div class="flex gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    :disabled="view.page <= 1"
                    @click="query.page = view.page - 1"
                >
                    {{ t("table.previous") }}
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    :disabled="view.page >= view.pages"
                    @click="query.page = view.page + 1"
                >
                    {{ t("table.next") }}
                </Button>
            </div>
        </div>
    </div>
</template>
