import type { Component } from "vue"
import { HouseIcon, NotebookPenIcon, ScrollTextIcon, SettingsIcon, UsersIcon } from "@lucide/vue"
import type { Action, Resource } from "#shared/utils/permissions"

export interface NavItem {
    to: string
    labelKey: string
    icon: Component
    /** Hidden unless the user can do this (same matrix the server enforces). */
    permission?: [Resource, Action]
}

export interface NavGroup {
    labelKey: string
    items: NavItem[]
}

/** The app sidebar, as data. New resources and modules add their entries here. */
export const NAVIGATION: NavGroup[] = [
    {
        labelKey: "nav.groups.main",
        items: [
            { to: "/app", labelKey: "nav.dashboard", icon: HouseIcon },
            { to: "/app/notes", labelKey: "nav.notes", icon: NotebookPenIcon, permission: ["notes", "read"] },
        ],
    },
    {
        labelKey: "nav.groups.admin",
        items: [
            { to: "/admin/utilizadores", labelKey: "nav.users", icon: UsersIcon, permission: ["users", "read"] },
            { to: "/admin/definicoes", labelKey: "nav.settings", icon: SettingsIcon, permission: ["settings", "manage"] },
            { to: "/admin/auditoria", labelKey: "nav.audit", icon: ScrollTextIcon, permission: ["audit", "read"] },
        ],
    },
]
