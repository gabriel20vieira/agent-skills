<script setup lang="ts">
import { NotebookPenIcon, PencilIcon, PlusIcon, TrashIcon } from "@lucide/vue"
import { noteCreateSchema } from "#shared/schemas/notes"

// The reference CRUD page: list (live), create/edit in a dialog, delete with confirmation.
definePageMeta({ layout: "app", titleKey: "notes.title", permission: ["notes", "read"] })

interface Note {
    id: number
    title: string
    body: string
    authorName: string | null
    updatedAt: string
}

const { t, d } = useI18n()
useHead({ title: () => t("notes.title") })

const api = useApi()
const allowed = useCan()
const confirm = useConfirm()
const notify = useNotify()
const errorMessage = useErrorMessage()

const { data: notes, pending, error: loadError, refresh } = await useAsyncData("notes", () => api<Note[]>("/api/notes"), { default: () => [] })
useLiveResource("notes", refresh)

const columns = computed(() => [
    { key: "title", label: t("notes.fields.title"), sortable: true },
    { key: "authorName", label: t("notes.fields.author"), sortable: true, class: "hidden md:table-cell" },
    { key: "updatedAt", label: t("notes.fields.updatedAt"), sortable: true, class: "hidden sm:table-cell" },
])

const editing = ref<Note | null>(null)
const dialogOpen = ref(false)
const form = useZodForm(noteCreateSchema, { title: "", body: "" })

function openCreate() {
    editing.value = null
    form.reset({ title: "", body: "" })
    dialogOpen.value = true
}

function openEdit(note: Note) {
    editing.value = note
    form.reset({ title: note.title, body: note.body })
    dialogOpen.value = true
}

async function save() {
    const saved = await form.submit(data => editing.value
        ? api(`/api/notes/${editing.value.id}`, { method: "PATCH", body: data })
        : api("/api/notes", { method: "POST", body: data }))
    if (!saved) return
    dialogOpen.value = false
    notify.success(editing.value ? "notes.updated" : "notes.created")
    await refresh()
}

async function remove(note: Note) {
    const ok = await confirm({
        title: t("notes.delete.title"),
        description: t("notes.delete.body", { title: note.title }),
        confirmLabel: t("common.delete"),
        destructive: true,
        action: () => api(`/api/notes/${note.id}`, { method: "DELETE" }),
    })
    if (!ok) return
    notify.success("notes.deleted")
    await refresh()
}
</script>

<template>
    <div>
        <PageHeader
            :title="t('notes.title')"
            :description="t('notes.description')"
        >
            <template #actions>
                <Button
                    v-if="allowed('notes', 'create')"
                    @click="openCreate"
                >
                    <PlusIcon /> {{ t("notes.new") }}
                </Button>
            </template>
        </PageHeader>

        <Alert
            v-if="loadError"
            variant="destructive"
        >
            <AlertDescription>{{ errorMessage(loadError) }}</AlertDescription>
        </Alert>

        <DataTable
            :rows="notes"
            :columns="columns"
            :search-keys="['title', 'body', 'authorName']"
            :loading="pending"
        >
            <template #cell-title="{ row }">
                <span class="font-medium">{{ row.title }}</span>
            </template>
            <template #cell-updatedAt="{ row }">
                {{ d(new Date(row.updatedAt), "long") }}
            </template>
            <template #row-actions="{ row }">
                <div class="flex justify-end gap-1">
                    <Button
                        v-if="allowed('notes', 'update')"
                        variant="ghost"
                        size="icon"
                        :aria-label="t('common.edit')"
                        @click="openEdit(row)"
                    >
                        <PencilIcon />
                    </Button>
                    <Button
                        v-if="allowed('notes', 'delete')"
                        variant="ghost"
                        size="icon"
                        :aria-label="t('common.delete')"
                        @click="remove(row)"
                    >
                        <TrashIcon />
                    </Button>
                </div>
            </template>
            <template #empty>
                <EmptyState
                    :icon="NotebookPenIcon"
                    :title="t('notes.empty.title')"
                    :description="t('notes.empty.description')"
                />
            </template>
        </DataTable>

        <ResponsiveDialog
            v-model:open="dialogOpen"
            :title="editing ? t('notes.edit') : t('notes.new')"
        >
            <form
                id="note-form"
                class="grid gap-4 pb-4 md:pb-0"
                @submit.prevent="save"
            >
                <Alert
                    v-if="form.formError.value"
                    variant="destructive"
                >
                    <AlertDescription>{{ form.formError.value }}</AlertDescription>
                </Alert>
                <FormField
                    for="note-title"
                    :label="t('notes.fields.title')"
                    :error="form.errors.title"
                >
                    <Input
                        id="note-title"
                        v-model="form.values.title"
                        :aria-invalid="!!form.errors.title"
                    />
                </FormField>
                <FormField
                    for="note-body"
                    :label="t('notes.fields.body')"
                    :error="form.errors.body"
                >
                    <Textarea
                        id="note-body"
                        v-model="form.values.body"
                        rows="6"
                    />
                </FormField>
            </form>
            <template #footer>
                <Button
                    variant="outline"
                    :disabled="form.pending.value"
                    @click="dialogOpen = false"
                >
                    {{ t("common.cancel") }}
                </Button>
                <Button
                    type="submit"
                    form="note-form"
                    :disabled="form.pending.value"
                >
                    {{ t("common.save") }}
                </Button>
            </template>
        </ResponsiveDialog>
    </div>
</template>
