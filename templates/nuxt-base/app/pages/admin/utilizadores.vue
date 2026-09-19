<script setup lang="ts">
import { KeyRoundIcon, MailPlusIcon, PencilIcon, TrashIcon, UserPlusIcon } from "@lucide/vue"
import { inviteCreateSchema } from "#shared/schemas/invites"
import { userCreateSchema } from "#shared/schemas/users"

definePageMeta({ layout: "app", titleKey: "users.title", permission: ["users", "read"] })

interface AdminUser {
    id: number
    email: string
    name: string
    roles: Role[]
    active: boolean
    mustChangePassword: boolean
    lastLoginAt: string | null
}

interface Invite {
    id: number
    email: string | null
    roles: Role[]
    expiresAt: string
}

const { t, d } = useI18n()
useHead({ title: () => t("users.title") })

const api = useApi()
const allowed = useCan()
const confirm = useConfirm()
const showSecret = useSecretDialog()
const notify = useNotify()
const session = useSession()

const { data: users, pending, refresh } = await useAsyncData("admin:users", () => api<AdminUser[]>("/api/admin/users"), { default: () => [] })
const { data: invites, refresh: refreshInvites } = await useAsyncData("admin:invites",
    () => allowed("users", "create") ? api<Invite[]>("/api/admin/invites") : Promise.resolve([]), { default: () => [] })
useLiveResource("users", refresh)

const columns = computed(() => [
    { key: "name", label: t("auth.name"), sortable: true },
    { key: "email", label: t("auth.email"), sortable: true, class: "hidden md:table-cell" },
    { key: "roles", label: t("users.roles") },
    { key: "active", label: t("users.status") },
    { key: "lastLoginAt", label: t("users.lastLogin"), sortable: true, class: "hidden lg:table-cell" },
])

// Create
const createOpen = ref(false)
const createForm = useZodForm(userCreateSchema, { email: "", name: "", roles: ["user"] as Role[] })

function openCreate() {
    createForm.reset({ email: "", name: "", roles: ["user"] })
    createOpen.value = true
}

async function create() {
    const result = await createForm.submit(data => api<{ generatedPassword?: string }>("/api/admin/users", { method: "POST", body: data }))
    if (!result) return
    createOpen.value = false
    await refresh()
    if (result.generatedPassword) {
        await showSecret({ title: t("users.createdTitle"), description: t("users.createdBody"), secret: result.generatedPassword })
    }
}

// Edit
const editing = ref<AdminUser | null>(null)
const editRoles = ref<Role[]>([])
const editActive = ref(true)
const editPending = ref(false)

function openEdit(user: AdminUser) {
    editing.value = user
    editRoles.value = [...user.roles]
    editActive.value = user.active
}

function toggleRole(list: Role[], role: Role, on: boolean) {
    const next = list.filter(item => item !== role)
    if (on) next.push(role)
    return next
}

async function saveEdit() {
    if (!editing.value) return
    editPending.value = true
    try {
        await api(`/api/admin/users/${editing.value.id}`, { method: "PATCH", body: { roles: editRoles.value, active: editActive.value } })
        editing.value = null
        notify.success("users.saved")
        await refresh()
    }
    catch (error) {
        notify.error(error)
    }
    finally {
        editPending.value = false
    }
}

async function resetPassword(user: AdminUser) {
    let password = ""
    const ok = await confirm({
        title: t("users.reset.title"),
        description: t("users.reset.body", { name: user.name }),
        confirmLabel: t("users.reset.confirm"),
        action: async () => {
            password = (await api<{ password: string }>(`/api/admin/users/${user.id}/reset-password`, { method: "POST" })).password
        },
    })
    if (ok) await showSecret({ title: t("users.reset.done"), secret: password })
}

async function remove(user: AdminUser) {
    const ok = await confirm({
        title: t("users.delete.title"),
        description: t("users.delete.body", { name: user.name }),
        confirmLabel: t("common.delete"),
        destructive: true,
        typeToConfirm: user.email,
        action: () => api(`/api/admin/users/${user.id}`, { method: "DELETE" }),
    })
    if (ok) {
        notify.success("users.deleted")
        await refresh()
    }
}

// Invites
const inviteOpen = ref(false)
const inviteForm = useZodForm(inviteCreateSchema, { email: undefined, roles: ["user"] as Role[], expiresInHours: 72 })

async function invite() {
    const result = await inviteForm.submit(data => api<{ token: string }>("/api/admin/invites", { method: "POST", body: data }))
    if (!result) return
    inviteOpen.value = false
    await refreshInvites()
    await showSecret({ title: t("users.invites.link"), secret: `${location.origin}/convite/${result.token}` })
}

async function revokeInvite(item: Invite) {
    const ok = await confirm({
        title: t("users.invites.revokeTitle"),
        confirmLabel: t("common.delete"),
        destructive: true,
        action: () => api(`/api/admin/invites/${item.id}`, { method: "DELETE" }),
    })
    if (ok) await refreshInvites()
}
</script>

<template>
    <div>
        <PageHeader
            :title="t('users.title')"
            :description="t('users.description')"
        >
            <template #actions>
                <template v-if="allowed('users', 'create')">
                    <Button
                        variant="outline"
                        @click="inviteForm.reset(); inviteOpen = true"
                    >
                        <MailPlusIcon /> {{ t("users.invites.new") }}
                    </Button>
                    <Button @click="openCreate">
                        <UserPlusIcon /> {{ t("users.new") }}
                    </Button>
                </template>
            </template>
        </PageHeader>

        <DataTable
            :rows="users"
            :columns="columns"
            :search-keys="['name', 'email']"
            :loading="pending"
        >
            <template #cell-roles="{ row }">
                <div class="flex flex-wrap gap-1">
                    <Badge
                        v-for="role in row.roles"
                        :key="role"
                        variant="secondary"
                    >
                        {{ t(`roles.${role}`) }}
                    </Badge>
                </div>
            </template>
            <template #cell-active="{ row }">
                <span :class="row.active ? 'text-success' : 'text-muted-foreground'">
                    {{ row.active ? t("users.active") : t("users.inactive") }}
                </span>
            </template>
            <template #cell-lastLoginAt="{ row }">
                {{ row.lastLoginAt ? d(new Date(row.lastLoginAt), "long") : "—" }}
            </template>
            <template #row-actions="{ row }">
                <div class="flex justify-end gap-1">
                    <template v-if="allowed('users', 'update')">
                        <Button
                            variant="ghost"
                            size="icon"
                            :aria-label="t('common.edit')"
                            @click="openEdit(row)"
                        >
                            <PencilIcon />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            :aria-label="t('users.reset.title')"
                            @click="resetPassword(row)"
                        >
                            <KeyRoundIcon />
                        </Button>
                    </template>
                    <Button
                        v-if="allowed('users', 'delete') && row.id !== session.user.value?.id"
                        variant="ghost"
                        size="icon"
                        :aria-label="t('common.delete')"
                        @click="remove(row)"
                    >
                        <TrashIcon />
                    </Button>
                </div>
            </template>
        </DataTable>

        <Card v-if="allowed('users', 'create') && invites.length">
            <CardHeader>
                <CardTitle>{{ t("users.invites.pending") }}</CardTitle>
            </CardHeader>
            <CardContent class="grid gap-2">
                <div
                    v-for="item in invites"
                    :key="item.id"
                    class="flex items-center justify-between gap-3 rounded-md border p-3 text-sm"
                >
                    <span>
                        {{ item.email ?? t("users.invites.anyEmail") }} ·
                        {{ item.roles.map(role => t(`roles.${role}`)).join(", ") }} ·
                        {{ t("users.invites.expires", { date: d(new Date(item.expiresAt), "long") }) }}
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        @click="revokeInvite(item)"
                    >
                        {{ t("common.delete") }}
                    </Button>
                </div>
            </CardContent>
        </Card>

        <!-- Create -->
        <ResponsiveDialog
            v-model:open="createOpen"
            :title="t('users.new')"
            :description="t('users.newHint')"
        >
            <form
                id="user-create"
                class="grid gap-4 pb-4 md:pb-0"
                @submit.prevent="create"
            >
                <Alert
                    v-if="createForm.formError.value"
                    variant="destructive"
                >
                    <AlertDescription>{{ createForm.formError.value }}</AlertDescription>
                </Alert>
                <FormField
                    for="user-name"
                    :label="t('auth.name')"
                    :error="createForm.errors.name"
                >
                    <Input
                        id="user-name"
                        v-model="createForm.values.name"
                    />
                </FormField>
                <FormField
                    for="user-email"
                    :label="t('auth.email')"
                    :error="createForm.errors.email"
                >
                    <Input
                        id="user-email"
                        v-model="createForm.values.email"
                        type="email"
                    />
                </FormField>
                <FormField
                    for="user-roles"
                    :label="t('users.roles')"
                    :error="createForm.errors.roles"
                >
                    <div
                        id="user-roles"
                        class="flex flex-wrap gap-4"
                    >
                        <label
                            v-for="role in ROLES"
                            :key="role"
                            class="flex items-center gap-2 text-sm"
                        >
                            <Checkbox
                                :model-value="createForm.values.roles.includes(role)"
                                @update:model-value="on => createForm.values.roles = toggleRole(createForm.values.roles, role, !!on)"
                            />
                            {{ t(`roles.${role}`) }}
                        </label>
                    </div>
                </FormField>
            </form>
            <template #footer>
                <Button
                    variant="outline"
                    @click="createOpen = false"
                >
                    {{ t("common.cancel") }}
                </Button>
                <Button
                    type="submit"
                    form="user-create"
                    :disabled="createForm.pending.value"
                >
                    {{ t("users.create") }}
                </Button>
            </template>
        </ResponsiveDialog>

        <!-- Edit -->
        <ResponsiveDialog
            :open="!!editing"
            :title="editing?.name ?? ''"
            :description="editing?.email"
            @update:open="value => { if (!value) editing = null }"
        >
            <div class="grid gap-4 pb-4 md:pb-0">
                <div class="grid gap-2">
                    <Label>{{ t("users.roles") }}</Label>
                    <div class="flex flex-wrap gap-4">
                        <label
                            v-for="role in ROLES"
                            :key="role"
                            class="flex items-center gap-2 text-sm"
                        >
                            <Checkbox
                                :model-value="editRoles.includes(role)"
                                @update:model-value="on => editRoles = toggleRole(editRoles, role, !!on)"
                            />
                            {{ t(`roles.${role}`) }}
                        </label>
                    </div>
                </div>
                <label class="flex items-center gap-3 text-sm">
                    <Switch v-model="editActive" />
                    {{ t("users.active") }}
                </label>
            </div>
            <template #footer>
                <Button
                    variant="outline"
                    @click="editing = null"
                >
                    {{ t("common.cancel") }}
                </Button>
                <Button
                    :disabled="editPending || !editRoles.length"
                    @click="saveEdit"
                >
                    {{ t("common.save") }}
                </Button>
            </template>
        </ResponsiveDialog>

        <!-- Invite -->
        <ResponsiveDialog
            v-model:open="inviteOpen"
            :title="t('users.invites.new')"
            :description="t('users.invites.hint')"
        >
            <form
                id="user-invite"
                class="grid gap-4 pb-4 md:pb-0"
                @submit.prevent="invite"
            >
                <Alert
                    v-if="inviteForm.formError.value"
                    variant="destructive"
                >
                    <AlertDescription>{{ inviteForm.formError.value }}</AlertDescription>
                </Alert>
                <FormField
                    for="invite-email"
                    :label="t('users.invites.email')"
                    :hint="t('users.invites.emailHint')"
                    :error="inviteForm.errors.email"
                >
                    <Input
                        id="invite-email"
                        type="email"
                        :model-value="inviteForm.values.email ?? ''"
                        @update:model-value="value => inviteForm.values.email = String(value) || undefined"
                    />
                </FormField>
                <FormField
                    for="invite-roles"
                    :label="t('users.roles')"
                    :error="inviteForm.errors.roles"
                >
                    <div
                        id="invite-roles"
                        class="flex flex-wrap gap-4"
                    >
                        <label
                            v-for="role in ROLES"
                            :key="role"
                            class="flex items-center gap-2 text-sm"
                        >
                            <Checkbox
                                :model-value="inviteForm.values.roles.includes(role)"
                                @update:model-value="on => inviteForm.values.roles = toggleRole(inviteForm.values.roles, role, !!on)"
                            />
                            {{ t(`roles.${role}`) }}
                        </label>
                    </div>
                </FormField>
            </form>
            <template #footer>
                <Button
                    variant="outline"
                    @click="inviteOpen = false"
                >
                    {{ t("common.cancel") }}
                </Button>
                <Button
                    type="submit"
                    form="user-invite"
                    :disabled="inviteForm.pending.value"
                >
                    {{ t("users.invites.create") }}
                </Button>
            </template>
        </ResponsiveDialog>
    </div>
</template>
