<script setup lang="ts">
import { Building2Icon, LogOutIcon, PlusIcon, TrashIcon, UserPlusIcon } from "@lucide/vue"
import { memberAddSchema, orgCreateSchema } from "#shared/schemas/organizations"
import type { OrgRole } from "#shared/utils/tenancy"
import { ORG_ROLES, canAssignOrgRole, orgCan } from "#shared/utils/tenancy"

definePageMeta({ layout: "app", titleKey: "orgs.title" })

interface Member {
    userId: number
    name: string
    email: string
    role: OrgRole
}

const { t } = useI18n()
useHead({ title: () => t("orgs.title") })

const api = useApi()
const allowed = useCan()
const confirm = useConfirm()
const notify = useNotify()
const session = useSession()
const { active, organizations, refresh: refreshOrgs } = useOrganizations()
await callOnce("orgs", refreshOrgs)

const role = computed(() => active.value?.role ?? null)
const { data: members, pending, refresh } = await useAsyncData("orgs:members",
    () => active.value ? api<Member[]>(`/api/orgs/${active.value.id}/members`) : Promise.resolve([]),
    { default: () => [], watch: [() => active.value?.id] })
useRealtimeEvent("organizations.members_changed", (data: { orgId?: number }) => {
    if (data?.orgId === active.value?.id) void refresh()
})

// DataTable rows need an id.
const rows = computed(() => members.value.map(member => ({ ...member, id: member.userId })))

const columns = computed(() => [
    { key: "name", label: t("auth.name"), sortable: true },
    { key: "email", label: t("auth.email"), sortable: true, class: "hidden md:table-cell" },
    { key: "role", label: t("orgs.role") },
])

// Create
const createOpen = ref(false)
const createForm = useZodForm(orgCreateSchema, { name: "" })

async function create() {
    const created = await createForm.submit(data => api<{ id: number }>("/api/orgs", { method: "POST", body: data }))
    if (!created) return
    createOpen.value = false
    createForm.reset({ name: "" })
    await refreshOrgs()
    notify.success("orgs.created")
}

// Members
const addOpen = ref(false)
const addForm = useZodForm(memberAddSchema, { email: "", role: "member" as OrgRole })

async function addMember() {
    const done = await addForm.submit(data => api(`/api/orgs/${active.value!.id}/members`, { method: "POST", body: data }))
    if (!done) return
    addOpen.value = false
    addForm.reset({ email: "", role: "member" })
    notify.success("orgs.memberAdded")
    await refresh()
}

async function changeRole(member: Member, next: OrgRole) {
    try {
        await api(`/api/orgs/${active.value!.id}/members/${member.userId}`, { method: "PATCH", body: { role: next } })
        notify.success("orgs.saved")
    }
    catch (error) {
        notify.error(error)
    }
    await refresh()
}

async function removeMember(member: Member) {
    const self = member.userId === session.user.value?.id
    const ok = await confirm({
        title: self ? t("orgs.leave.title") : t("orgs.remove.title"),
        description: self ? t("orgs.leave.body", { org: active.value!.name }) : t("orgs.remove.body", { name: member.name }),
        confirmLabel: self ? t("orgs.leave.confirm") : t("common.delete"),
        destructive: true,
        action: () => api(`/api/orgs/${active.value!.id}/members/${member.userId}`, { method: "DELETE" }),
    })
    if (!ok) return
    if (self) await refreshOrgs()
    else await refresh()
}

async function deleteOrg() {
    const org = active.value!
    const ok = await confirm({
        title: t("orgs.delete.title"),
        description: t("orgs.delete.body", { org: org.name }),
        confirmLabel: t("common.delete"),
        destructive: true,
        typeToConfirm: org.name,
        action: () => api(`/api/orgs/${org.id}`, { method: "DELETE" }),
    })
    if (!ok) return
    notify.success("orgs.deleted")
    await refreshOrgs()
}

const me = computed(() => members.value.find(member => member.userId === session.user.value?.id))
</script>

<template>
    <div>
        <PageHeader
            :title="t('orgs.title')"
            :description="active ? active.name : t('orgs.description')"
        >
            <template #actions>
                <Button
                    v-if="active && orgCan(role, 'manage_members')"
                    variant="outline"
                    @click="addOpen = true"
                >
                    <UserPlusIcon /> {{ t("orgs.addMember") }}
                </Button>
                <Button
                    v-if="allowed('organizations', 'create')"
                    @click="createOpen = true"
                >
                    <PlusIcon /> {{ t("orgs.new") }}
                </Button>
            </template>
        </PageHeader>

        <EmptyState
            v-if="!organizations.length"
            :icon="Building2Icon"
            :title="t('orgs.empty.title')"
            :description="t('orgs.empty.description')"
        />

        <template v-else-if="active">
            <DataTable
                :rows="rows"
                :columns="columns"
                :search-keys="['name', 'email']"
                :loading="pending"
            >
                <template #cell-role="{ row }">
                    <Select
                        v-if="orgCan(role, 'manage_members') && row.userId !== session.user.value?.id"
                        :model-value="row.role"
                        @update:model-value="value => changeRole(row, value as OrgRole)"
                    >
                        <SelectTrigger
                            class="h-8 w-36"
                            :aria-label="t('orgs.role')"
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem
                                v-for="item in ORG_ROLES"
                                :key="item"
                                :value="item"
                                :disabled="!canAssignOrgRole(role!, row.role, item)"
                            >
                                {{ t(`orgs.roles.${item}`) }}
                            </SelectItem>
                        </SelectContent>
                    </Select>
                    <Badge
                        v-else
                        variant="secondary"
                    >
                        {{ t(`orgs.roles.${row.role}`) }}
                    </Badge>
                </template>
                <template #row-actions="{ row }">
                    <div class="flex justify-end">
                        <Button
                            v-if="row.userId === session.user.value?.id || (orgCan(role, 'manage_members') && canAssignOrgRole(role!, row.role, 'member'))"
                            variant="ghost"
                            size="icon"
                            :aria-label="row.userId === session.user.value?.id ? t('orgs.leave.confirm') : t('common.delete')"
                            @click="removeMember(row)"
                        >
                            <LogOutIcon v-if="row.userId === session.user.value?.id" />
                            <TrashIcon v-else />
                        </Button>
                    </div>
                </template>
            </DataTable>

            <div
                v-if="me && orgCan(me.role, 'delete_org')"
                class="flex justify-end"
            >
                <Button
                    variant="destructive"
                    @click="deleteOrg"
                >
                    <TrashIcon /> {{ t("orgs.delete.title") }}
                </Button>
            </div>
        </template>

        <ResponsiveDialog
            v-model:open="createOpen"
            :title="t('orgs.new')"
        >
            <form
                id="org-form"
                class="grid gap-4 pb-4 md:pb-0"
                @submit.prevent="create"
            >
                <FormField
                    for="org-name"
                    :label="t('orgs.name')"
                    :error="createForm.errors.name"
                >
                    <Input
                        id="org-name"
                        v-model="createForm.values.name"
                        :aria-invalid="!!createForm.errors.name"
                    />
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
                    form="org-form"
                    :disabled="createForm.pending.value"
                >
                    {{ t("common.save") }}
                </Button>
            </template>
        </ResponsiveDialog>

        <ResponsiveDialog
            v-model:open="addOpen"
            :title="t('orgs.addMember')"
            :description="t('orgs.addMemberHint')"
        >
            <form
                id="member-form"
                class="grid gap-4 pb-4 md:pb-0"
                @submit.prevent="addMember"
            >
                <Alert
                    v-if="addForm.formError.value"
                    variant="destructive"
                >
                    <AlertDescription>{{ addForm.formError.value }}</AlertDescription>
                </Alert>
                <FormField
                    for="member-email"
                    :label="t('auth.email')"
                    :error="addForm.errors.email"
                >
                    <Input
                        id="member-email"
                        v-model="addForm.values.email"
                        type="email"
                        :aria-invalid="!!addForm.errors.email"
                    />
                </FormField>
                <FormField
                    for="member-role"
                    :label="t('orgs.role')"
                >
                    <Select v-model="addForm.values.role">
                        <SelectTrigger id="member-role">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem
                                v-for="item in ORG_ROLES"
                                :key="item"
                                :value="item"
                                :disabled="!role || !canAssignOrgRole(role, null, item)"
                            >
                                {{ t(`orgs.roles.${item}`) }}
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </FormField>
            </form>
            <template #footer>
                <Button
                    variant="outline"
                    @click="addOpen = false"
                >
                    {{ t("common.cancel") }}
                </Button>
                <Button
                    type="submit"
                    form="member-form"
                    :disabled="addForm.pending.value"
                >
                    {{ t("orgs.addMember") }}
                </Button>
            </template>
        </ResponsiveDialog>
    </div>
</template>
