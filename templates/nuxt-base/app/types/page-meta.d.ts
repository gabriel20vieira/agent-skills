import type { Action, Resource } from "../../shared/utils/permissions"

declare module "#app" {
    interface PageMeta {
        /** false = public page; "guest" = only when signed out. Default: signed in. */
        auth?: false | "guest"
        /** Checked by the route middleware against the shared permission matrix. */
        permission?: [Resource, Action]
        /** i18n keys the app layout shows as the page title and subtitle. */
        titleKey?: string
        subtitleKey?: string
    }
}

export {}
