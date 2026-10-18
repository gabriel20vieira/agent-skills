# Plano 1 — Esqueleto do repo e template base

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deixar o repo `agent-skills` como plugin do Claude Code e criar `templates/nuxt-base/`: uma app Nuxt 4 que arranca, com UI (Tailwind v4 + shadcn-vue), i18n, tema claro/escuro, MySQL com migrações Drizzle e `/api/health`. Tem de correr com Docker e sem Docker.

**Architecture:** Monólito Nuxt 4 full-stack (Nitro `node-server`), com `app/`, `server/` e `shared/`. O código puro fica em `shared/` e `scripts/lib/`, testado com vitest. A DB é MySQL 8.4 via Drizzle, com migrações versionadas aplicadas pelo entrypoint do contentor ou por `npm run db:migrate`.

**Tech Stack:** Nuxt 4.5, Vue 3.5, TypeScript 5.9, Tailwind 4.3, shadcn-vue (reka-ui 2.10), @nuxtjs/i18n 10, @nuxtjs/color-mode 4, drizzle-orm 0.45 / drizzle-kit 0.31, mysql2 3, zod 4, vitest 5, @nuxt/eslint 1.17, Node 24, Docker Compose v2.

**Spec:** `docs/superpowers/specs/2026-09-19-website-foundation-design.md`

## Roteiro (este é o plano 1 de 6)

1. **Repo e template base** (este plano): scaffold, UI, i18n, DB, health, deploy.
2. Auth, sessões, permissões, utilizadores, definições, auditoria (spec §5, §6, §12).
3. Tempo real via WebSocket (spec §7).
4. Dialogs, componentes, temas, layouts e páginas do núcleo, CRUD de exemplo `notes` (spec §8–§11).
5. Skills do núcleo (spec §2, §18.3).
6. Módulos: assistant, pwa, tenancy, public-site (spec §15).

## Global Constraints

- Node 24; npm é o único package manager, com um só lockfile (`package-lock.json`).
- Versões mínimas: `nuxt ^4.5.2`, `tailwindcss ^4.3.3`, `drizzle-orm ^0.45.2`, `drizzle-kit ^0.31.10`, `zod ^4.6.5`, `typescript ^5.9.3`. O TypeScript 7 fica de fora porque o `vue-tsc` ainda não o suporta.
- Ícones: só `@lucide/vue`.
- Código, comentários e identificadores em inglês. Texto visível só via chaves i18n, com pt-PT por defeito e en-US.
- Estilo: 4 espaços, aspas duplas, sem ponto e vírgula. É imposto pelo `@nuxt/eslint` (stylistic).
- Rotas de páginas em português; APIs em inglês (`/api/health`).
- Erros de API: `createError({ statusCode, message, data: { code } })`.
- DB: só MySQL 8.4. Nunca usar `drizzle-kit push` em produção.
- Nunca commitar `.env`, dumps (`backups/`) nem logs de ferramentas.
- Commits em conventional commits, terminados com:
  ```
  Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01AGoSadvU817FeBt7aPgNpz
  ```
- Todos os caminhos do template são relativos a `templates/nuxt-base/`, salvo indicação em contrário. Os comandos `npm` correm a partir dessa pasta.

---

## Mapa de ficheiros

```
.claude-plugin/plugin.json          manifesto do plugin
README.md  CLAUDE.md  .gitignore  .gitattributes
skills/README.md  modules/README.md
templates/nuxt-base/
  package.json  nuxt.config.ts  tsconfig.json  eslint.config.mjs  vitest.config.ts
  drizzle.config.ts  components.json  .gitignore  .dockerignore  .env.example
  Dockerfile  docker-compose.yaml  README.md  CLAUDE.md
  app/app.vue
  app/layouts/public.vue  app/layouts/blank.vue
  app/pages/index.vue
  app/lib/utils.ts                        cn()
  app/components/ui/button/{index.ts,Button.vue}
  app/assets/css/main.css                 tokens, dark, shim reka
  i18n/i18n.config.ts  i18n/locales/{pt-PT,en-US}.json
  shared/utils/normalizeText.ts           pesquisa sem acentos
  shared/utils/apiError.ts                extrai {status, code, message} de um erro $fetch
  server/utils/fail.ts                    fail(status, code, message?) -> H3Error
  server/utils/secretStrength.ts          isWeakSecret()
  server/utils/db.ts                      re-export useDb
  server/db/index.ts                      useDb() com pool mysql2
  server/db/schema/{index,settings}.ts
  server/plugins/00.secret-guard.ts
  server/middleware/04.no-store.ts
  server/api/health.get.ts
  drizzle/0000_init.sql + meta/           gerado
  scripts/lib/baseline.mjs                decideBaseline() puro
  scripts/baseline-migrations.mjs  scripts/wait-for-db.mjs
  scripts/gen-secrets.ps1  scripts/gen-secrets.sh
  scripts/docker-clean.ps1  scripts/backup.ps1  scripts/backup.sh
  docker/entrypoint.sh
  deploy/Caddyfile  deploy/nginx.conf  deploy/nuxt-base.service
  test/unit/*.test.ts
```

---

### Task 1: Esqueleto do repo como plugin

**Files:**
- Create: `.claude-plugin/plugin.json`, `README.md`, `CLAUDE.md`, `.gitignore`, `skills/README.md`, `modules/README.md`
- Modify: `.gitattributes`

**Interfaces:**
- Produces: a estrutura de pastas que os planos 4–6 preenchem (`skills/<nome>/SKILL.md`, `modules/<nome>/`).

- [ ] **Step 1: Criar o manifesto**

`.claude-plugin/plugin.json`:
```json
{
    "name": "web-foundation",
    "version": "0.1.0",
    "description": "Nuxt 4 website foundation: a runnable template plus skills to scaffold projects and add resources, realtime, assistant, PWA and deploy.",
    "author": { "name": "Gabriel Vieira", "email": "gabriel20vieira@hotmail.com" },
    "keywords": ["nuxt", "website", "template", "scaffold"]
}
```

- [ ] **Step 2: Validar o manifesto**

Run: `claude plugin validate .`
Expected: sem erros. Um aviso por não existirem skills ainda é aceitável.

- [ ] **Step 3: Ficheiros de raiz**

`.gitattributes` (substituir o conteúdo):
```
* text=auto
*.sh text eol=lf
*.ps1 text eol=crlf
```

`.gitignore`:
```
node_modules/
.nuxt/
.output/
.data/
.env
backups/
.playwright-mcp/
*.log
```

`skills/README.md`:
```markdown
# Skills

One folder per skill, each with a `SKILL.md`. Skills describe the extension points of
`templates/nuxt-base` and never duplicate its code. See the design spec in
`docs/superpowers/specs/2026-09-19-website-foundation-design.md` (section 2).
```

`modules/README.md`:
```markdown
# Modules

Optional features (assistant, pwa, tenancy, public-site) applied to a project by their
skill. Each module lists the files it adds and the core extension points it touches.
```

`README.md`:
```markdown
# agent-skills — website foundation

Claude Code plugin to build websites quickly on one consistent base.

- `templates/nuxt-base/` — runnable Nuxt 4 app with the core (UI, i18n, DB, deploy; auth,
  permissions and realtime arrive in the next plans).
- `skills/` — skills that scaffold a project from the template and extend it.
- `modules/` — optional features applied by skills.
- `docs/superpowers/` — design spec and implementation plans.

## Install

    claude plugin marketplace add <path-or-git-url-of-this-repo>
    claude plugin install web-foundation

## Work on the template

    cd templates/nuxt-base
    npm install
    npm run check

See `templates/nuxt-base/README.md` for running it with and without Docker.
```

`CLAUDE.md`:
```markdown
# agent-skills

Plugin repo: a Nuxt 4 template (`templates/nuxt-base`) plus skills that use it.

## Rules
- The template is the source of truth. Skills point at its files; they never copy code.
- Any change to the template must keep `npm run check` green (run it in
  `templates/nuxt-base`).
- Design lives in `docs/superpowers/specs/`, plans in `docs/superpowers/plans/`.
- Code and comments in English; user-facing strings via i18n (pt-PT default, en-US).
- Style: 4 spaces, double quotes, no semicolons (enforced by eslint).
- npm only. Never commit `.env`, dumps or tool logs.
```

- [ ] **Step 4: Commit**

```bash
git add .claude-plugin README.md CLAUDE.md .gitignore .gitattributes skills modules
git commit -m "chore: set up repo as a Claude Code plugin"
```

---

### Task 2: Scaffold do template (Nuxt, lint, typecheck, vitest, scripts npm)

**Files:**
- Create: `package.json`, `nuxt.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `vitest.config.ts`, `.gitignore`, `app/app.vue`, `app/layouts/public.vue`, `app/layouts/blank.vue`, `app/pages/index.vue` (temporária, reescrita na Task 4), `test/unit/smoke.test.ts` (removido na Task 3)

**Interfaces:**
- Produces:
  - scripts npm `dev`, `build`, `start`, `lint`, `lint:fix`, `typecheck`, `test`, `check`, `db:generate`, `db:migrate`;
  - `runtimeConfig.public.appName: string` e `runtimeConfig.public.appVersion: string`;
  - layouts `public` e `blank`.

- [ ] **Step 1: `package.json`**

```json
{
    "name": "nuxt-base",
    "version": "0.1.0",
    "private": true,
    "type": "module",
    "scripts": {
        "dev": "node --env-file-if-exists=.env node_modules/nuxt/bin/nuxt.mjs dev",
        "build": "nuxt build",
        "start": "node --env-file-if-exists=.env .output/server/index.mjs",
        "postinstall": "nuxt prepare",
        "lint": "eslint .",
        "lint:fix": "eslint . --fix",
        "typecheck": "nuxt typecheck",
        "test": "vitest run",
        "test:watch": "vitest",
        "check": "npm run lint && npm run typecheck && npm run test",
        "db:generate": "drizzle-kit generate",
        "db:migrate": "node --env-file-if-exists=.env scripts/baseline-migrations.mjs && drizzle-kit migrate"
    },
    "dependencies": {
        "@fontsource-variable/geist": "^5.3.0",
        "@fontsource-variable/geist-mono": "^5.2.0",
        "@lucide/vue": "^1.47.0",
        "@nuxtjs/color-mode": "^4.0.1",
        "@nuxtjs/i18n": "^10.6.0",
        "@vueuse/core": "^14.4.0",
        "class-variance-authority": "^0.7.1",
        "clsx": "^2.1.1",
        "drizzle-orm": "^0.45.2",
        "mysql2": "^3.24.4",
        "nuxt": "^4.5.2",
        "reka-ui": "^2.10.4",
        "tailwind-merge": "^3.7.0",
        "vue": "^3.5.28",
        "vue-router": "^4.6.4",
        "zod": "^4.6.5"
    },
    "devDependencies": {
        "@nuxt/eslint": "^1.17.0",
        "@tailwindcss/vite": "^4.3.3",
        "drizzle-kit": "^0.31.10",
        "eslint": "^9.39.0",
        "shadcn-nuxt": "^2.8.2",
        "tailwindcss": "^4.3.3",
        "tw-animate-css": "^1.4.0",
        "typescript": "^5.9.3",
        "vitest": "^5.0.1",
        "vue-tsc": "^3.3.11"
    }
}
```
Nota: `eslint ^9` de propósito. O `@nuxt/eslint 1.x` foi validado sobre o ESLint 9; o 10 é recente demais para arriscar. Se o `npm install` mostrar um conflito de peer, usar a versão que o `npm view @nuxt/eslint peerDependencies` indicar.

- [ ] **Step 2: `nuxt.config.ts`**

```ts
import tailwindcss from "@tailwindcss/vite"
import pkg from "./package.json" with { type: "json" }

export default defineNuxtConfig({
    compatibilityDate: "2026-09-01",
    devtools: { enabled: true },
    modules: ["@nuxt/eslint", "shadcn-nuxt", "@nuxtjs/color-mode", "@nuxtjs/i18n"],
    css: ["~/assets/css/main.css"],
    vite: { plugins: [tailwindcss()] },
    nitro: { preset: "node-server" },
    eslint: {
        config: {
            stylistic: { indent: 4, quotes: "double", semi: false },
        },
    },
    shadcn: { prefix: "", componentDir: "./app/components/ui" },
    colorMode: {
        classSuffix: "",
        preference: "system",
        fallback: "light",
        // A cookie, not localStorage, so SSR renders the right class and the page never flashes.
        storage: "cookie",
    },
    i18n: {
        defaultLocale: "pt-PT",
        strategy: "no_prefix",
        locales: [
            { code: "pt-PT", language: "pt-PT", name: "Português", file: "pt-PT.json" },
            { code: "en-US", language: "en-US", name: "English", file: "en-US.json" },
        ],
        detectBrowserLanguage: {
            useCookie: true,
            cookieKey: "i18n_locale",
            fallbackLocale: "pt-PT",
        },
    },
    runtimeConfig: {
        public: {
            // NUXT_PUBLIC_APP_NAME
            appName: "Nuxt Base",
            // Baked at build time; shown by /api/health.
            appVersion: pkg.version,
        },
    },
})
```

- [ ] **Step 3: `tsconfig.json`, `eslint.config.mjs`, `vitest.config.ts`, `.gitignore`**

`tsconfig.json`:
```json
{
    "files": [],
    "references": [
        { "path": "./.nuxt/tsconfig.app.json" },
        { "path": "./.nuxt/tsconfig.server.json" },
        { "path": "./.nuxt/tsconfig.shared.json" },
        { "path": "./.nuxt/tsconfig.node.json" }
    ]
}
```

`eslint.config.mjs`:
```js
import withNuxt from "./.nuxt/eslint.config.mjs"

export default withNuxt({
    // Generated code: shadcn components and drizzle migrations are not edited by hand.
    ignores: ["app/components/ui/**", "drizzle/**"],
})
```

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config"

export default defineConfig({
    test: {
        include: ["test/unit/**/*.test.ts"],
        environment: "node",
    },
})
```

`.gitignore`:
```
node_modules/
.nuxt/
.output/
.data/
.env
backups/
*.log
```

- [ ] **Step 4: App mínima**

`app/app.vue`:
```vue
<script setup lang="ts">
const config = useRuntimeConfig()
const localeHead = useLocaleHead()

useHead(() => ({
    htmlAttrs: { lang: localeHead.value.htmlAttrs?.lang },
    titleTemplate: (title?: string) =>
        title ? `${title} · ${config.public.appName}` : config.public.appName,
}))
</script>

<template>
    <NuxtLayout>
        <NuxtPage />
    </NuxtLayout>
</template>
```

`app/layouts/public.vue`:
```vue
<template>
    <div class="flex min-h-dvh flex-col">
        <main class="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
            <slot />
        </main>
    </div>
</template>
```

`app/layouts/blank.vue`:
```vue
<template>
    <slot />
</template>
```

`app/pages/index.vue` (temporária):
```vue
<script setup lang="ts">
definePageMeta({ layout: "public" })
</script>

<template>
    <h1>nuxt-base</h1>
</template>
```

Criar `app/assets/css/main.css` só com `@import "tailwindcss";`, porque a Task 4 o completa. Criar também `i18n/locales/pt-PT.json` e `i18n/locales/en-US.json` com `{}`, porque a Task 5 os preenche.

- [ ] **Step 5: Teste smoke para validar o vitest**

`test/unit/smoke.test.ts`:
```ts
import { expect, it } from "vitest"

it("runs vitest", () => {
    expect(1 + 1).toBe(2)
})
```

- [ ] **Step 6: Instalar e verificar**

Run: `npm install`
Expected: instala e corre o `nuxt prepare` sem erro. Se o npm 11 disser que bloqueou install scripts (por exemplo `esbuild`, `vue-demi`), correr `npm approve-scripts <nomes listados>` e voltar a correr `npm install`. Isto deixa `allowScripts` no `package.json`, que deve ser commitado.

Run: `npm run lint:fix && npm run check`
Expected: lint sem erros, typecheck sem erros, `1 passed`.

Run: `npm run build`
Expected: termina com `✨ Build complete!` (ou "Server built").

- [ ] **Step 7: Commit**

```bash
git add templates/nuxt-base
git commit -m "feat(template): scaffold Nuxt 4 app with lint, typecheck and vitest"
```

---

### Task 3: Utilitários partilhados e envelope de erro

**Files:**
- Create: `shared/utils/normalizeText.ts`, `shared/utils/apiError.ts`, `server/utils/fail.ts`, `server/utils/secretStrength.ts`
- Test: `test/unit/normalizeText.test.ts`, `test/unit/apiError.test.ts`, `test/unit/fail.test.ts`, `test/unit/secretStrength.test.ts`
- Delete: `test/unit/smoke.test.ts`

**Interfaces:**
- Produces:
  - `normalizeText(value: string): string`: minúsculas, sem acentos, espaços colapsados.
  - `extractApiError(error: unknown): { status: number; code: string; message: string }`. O `code` vale `"network.unreachable"` quando `status === 0` e `"errors.unknown"` quando não há `data.code`.
  - `fail(statusCode: number, code: string, message?: string): H3Error`, com `data: { code }`.
  - `isWeakSecret(secret: string | undefined): boolean`.

- [ ] **Step 1: Testes que falham**

`test/unit/normalizeText.test.ts`:
```ts
import { describe, expect, it } from "vitest"
import { normalizeText } from "../../shared/utils/normalizeText"

describe("normalizeText", () => {
    it("lowercases and strips accents", () => {
        expect(normalizeText("Ação São João")).toBe("acao sao joao")
    })
    it("collapses and trims whitespace", () => {
        expect(normalizeText("  a   b\t c ")).toBe("a b c")
    })
    it("keeps digits and punctuation", () => {
        expect(normalizeText("Nº 12-B")).toBe("nº 12-b")
    })
})
```

`test/unit/apiError.test.ts`:
```ts
import { describe, expect, it } from "vitest"
import { extractApiError } from "../../shared/utils/apiError"

describe("extractApiError", () => {
    it("reads status, code and message from an ofetch error", () => {
        const error = {
            statusCode: 403,
            data: { statusCode: 403, message: "Forbidden", data: { code: "auth.forbidden" } },
        }
        expect(extractApiError(error)).toEqual({ status: 403, code: "auth.forbidden", message: "Forbidden" })
    })
    it("falls back to errors.unknown when the body has no code", () => {
        const error = { statusCode: 500, data: { message: "boom" } }
        expect(extractApiError(error)).toEqual({ status: 500, code: "errors.unknown", message: "boom" })
    })
    it("maps a missing status to network.unreachable", () => {
        expect(extractApiError(new Error("fetch failed"))).toEqual({
            status: 0,
            code: "network.unreachable",
            message: "fetch failed",
        })
    })
    it("survives non-objects", () => {
        expect(extractApiError(undefined)).toEqual({ status: 0, code: "network.unreachable", message: "" })
    })
})
```

`test/unit/fail.test.ts`:
```ts
import { describe, expect, it } from "vitest"
import { fail } from "../../server/utils/fail"

describe("fail", () => {
    it("builds an H3 error carrying the code", () => {
        const error = fail(403, "auth.forbidden")
        expect(error.statusCode).toBe(403)
        expect(error.message).toBe("auth.forbidden")
        expect(error.data).toEqual({ code: "auth.forbidden" })
    })
    it("uses the given message when present", () => {
        expect(fail(409, "users.last_admin", "Cannot remove the last admin").message).toBe(
            "Cannot remove the last admin",
        )
    })
})
```

`test/unit/secretStrength.test.ts`:
```ts
import { describe, expect, it } from "vitest"
import { isWeakSecret } from "../../server/utils/secretStrength"

describe("isWeakSecret", () => {
    it("rejects missing and short secrets", () => {
        expect(isWeakSecret(undefined)).toBe(true)
        expect(isWeakSecret("")).toBe(true)
        expect(isWeakSecret("a".repeat(31))).toBe(true)
    })
    it("rejects known placeholders even when long", () => {
        expect(isWeakSecret("change-me-change-me-change-me-change-me")).toBe(true)
        expect(isWeakSecret("this-is-an-example-secret-of-enough-length")).toBe(true)
    })
    it("accepts a long random secret", () => {
        expect(isWeakSecret("q8Zc1vH0yT3kP9mW2sL7xN4bR6fJ5dA0gE1hU8iO3pK=")).toBe(false)
    })
})
```

Apagar `test/unit/smoke.test.ts`.

- [ ] **Step 2: Correr e ver falhar**

Run: `npm test`
Expected: FAIL com "Failed to resolve import" nos 4 ficheiros.

- [ ] **Step 3: Implementar**

`shared/utils/normalizeText.ts`:
```ts
/** Lowercase, accent-free, single-spaced: the form every search compares against. */
export function normalizeText(value: string): string {
    return value
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim()
}
```

`shared/utils/apiError.ts`:
```ts
export interface ApiErrorInfo {
    status: number
    code: string
    message: string
}

interface FetchErrorLike {
    statusCode?: number
    status?: number
    message?: string
    data?: { statusCode?: number, message?: string, data?: { code?: string } }
}

/**
 * Reads the envelope every API error uses: createError({ statusCode, message, data: { code } }).
 * The client translates `code`; `message` is only a fallback.
 */
export function extractApiError(error: unknown): ApiErrorInfo {
    const err = (error && typeof error === "object" ? error : {}) as FetchErrorLike
    const status = err.statusCode ?? err.status ?? err.data?.statusCode ?? 0
    const fallback = status === 0 ? "network.unreachable" : "errors.unknown"
    return {
        status,
        code: err.data?.data?.code ?? fallback,
        message: err.data?.message ?? err.message ?? "",
    }
}
```

`server/utils/fail.ts`:
```ts
import { createError } from "h3"

/** The one way handlers raise errors: `throw fail(403, "auth.forbidden")`. */
export function fail(statusCode: number, code: string, message?: string) {
    return createError({ statusCode, message: message ?? code, data: { code } })
}
```

`server/utils/secretStrength.ts`:
```ts
const PLACEHOLDERS = ["change-me", "changeme", "example", "dev-only", "min-32-chars"]

/** A predictable session secret lets anyone forge a session cookie. */
export function isWeakSecret(secret: string | undefined): boolean {
    if (!secret || secret.length < 32) return true
    const lower = secret.toLowerCase()
    return PLACEHOLDERS.some(marker => lower.includes(marker))
}
```

- [ ] **Step 4: Correr e ver passar**

Run: `npm test`
Expected: PASS, 12 testes.

- [ ] **Step 5: Commit**

```bash
git add -A templates/nuxt-base
git commit -m "feat(template): add shared text/error utils and secret strength check"
```

---

### Task 4: UI base (Tailwind v4, tokens, modo escuro, shadcn Button)

**Files:**
- Create: `components.json`, `app/lib/utils.ts`, `app/components/ui/button/index.ts`, `app/components/ui/button/Button.vue`
- Modify: `app/assets/css/main.css`, `app/pages/index.vue`
- Test: `test/unit/cn.test.ts`

**Interfaces:**
- Consumes: layout `public` (Task 2).
- Produces:
  - `cn(...inputs: ClassValue[]): string`;
  - componente `<Button variant size as as-child>`;
  - tokens CSS `--background … --sidebar-ring`, `--success`, `--warning`, `--danger`, `--chart-1..5`;
  - variantes Tailwind `data-open`, `data-closed`, `data-checked`, `data-unchecked`, `data-active`.

- [ ] **Step 1: Teste que falha**

`test/unit/cn.test.ts`:
```ts
import { expect, it } from "vitest"
import { cn } from "../../app/lib/utils"

it("merges classes and lets later tailwind utilities win", () => {
    expect(cn("px-2 py-1", false && "hidden", "px-4")).toBe("py-1 px-4")
})
```

Run: `npm test -- cn`
Expected: FAIL, "Failed to resolve import".

- [ ] **Step 2: `app/lib/utils.ts` e `components.json`**

```ts
import type { ClassValue } from "clsx"
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}
```

`components.json` (usado pelo CLI do shadcn-vue nos planos seguintes):
```json
{
    "$schema": "https://shadcn-vue.com/schema.json",
    "style": "new-york",
    "typescript": true,
    "tailwind": {
        "config": "",
        "css": "app/assets/css/main.css",
        "baseColor": "neutral",
        "cssVariables": true
    },
    "aliases": {
        "components": "@/components",
        "composables": "@/composables",
        "utils": "@/lib/utils",
        "ui": "@/components/ui",
        "lib": "@/lib"
    },
    "iconLibrary": "lucide"
}
```

Run: `npm test -- cn`
Expected: PASS.

- [ ] **Step 3: `app/assets/css/main.css`**

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "@fontsource-variable/geist";
@import "@fontsource-variable/geist-mono";

@custom-variant dark (&:is(.dark *));

/*
 * shadcn-vue components (and docs copied from shadcn/ui) style state with data-open,
 * data-checked, ... but reka-ui exposes data-state. Map both onto the same variants.
 */
@custom-variant data-open (&:is([data-state="open"], [data-open]:not([data-open="false"])));
@custom-variant data-closed (&:is([data-state="closed"], [data-closed]:not([data-closed="false"])));
@custom-variant data-checked (&:is([data-state="checked"], [data-checked]:not([data-checked="false"])));
@custom-variant data-unchecked (&:is([data-state="unchecked"], [data-unchecked]:not([data-unchecked="false"])));
@custom-variant data-active (&:is([data-state="active"], [data-active]:not([data-active="false"])));

/* Default theme (shadcn neutral). Extra themes live in themes/*.css as [data-theme="x"]. */
:root {
    --radius: 0.625rem;
    --background: oklch(1 0 0);
    --foreground: oklch(0.145 0 0);
    --card: oklch(1 0 0);
    --card-foreground: oklch(0.145 0 0);
    --popover: oklch(1 0 0);
    --popover-foreground: oklch(0.145 0 0);
    --primary: oklch(0.205 0 0);
    --primary-foreground: oklch(0.985 0 0);
    --secondary: oklch(0.97 0 0);
    --secondary-foreground: oklch(0.205 0 0);
    --muted: oklch(0.97 0 0);
    --muted-foreground: oklch(0.556 0 0);
    --accent: oklch(0.97 0 0);
    --accent-foreground: oklch(0.205 0 0);
    --destructive: oklch(0.577 0.245 27.325);
    --border: oklch(0.922 0 0);
    --input: oklch(0.922 0 0);
    --ring: oklch(0.708 0 0);
    /* Text colours (not fills): measured against --background/--card. */
    --success: oklch(0.52 0.14 150);
    --warning: oklch(0.55 0.13 70);
    --danger: oklch(0.55 0.19 27);
    --chart-1: oklch(0.646 0.222 41.116);
    --chart-2: oklch(0.6 0.118 184.704);
    --chart-3: oklch(0.398 0.07 227.392);
    --chart-4: oklch(0.828 0.189 84.429);
    --chart-5: oklch(0.769 0.188 70.08);
    --sidebar: oklch(0.985 0 0);
    --sidebar-foreground: oklch(0.145 0 0);
    --sidebar-primary: oklch(0.205 0 0);
    --sidebar-primary-foreground: oklch(0.985 0 0);
    --sidebar-accent: oklch(0.97 0 0);
    --sidebar-accent-foreground: oklch(0.205 0 0);
    --sidebar-border: oklch(0.922 0 0);
    --sidebar-ring: oklch(0.708 0 0);
    --font-sans: "Geist Variable", ui-sans-serif, system-ui, sans-serif;
    --font-mono: "Geist Mono Variable", ui-monospace, monospace;
}

.dark {
    --background: oklch(0.145 0 0);
    --foreground: oklch(0.985 0 0);
    --card: oklch(0.205 0 0);
    --card-foreground: oklch(0.985 0 0);
    --popover: oklch(0.205 0 0);
    --popover-foreground: oklch(0.985 0 0);
    --primary: oklch(0.922 0 0);
    --primary-foreground: oklch(0.205 0 0);
    --secondary: oklch(0.269 0 0);
    --secondary-foreground: oklch(0.985 0 0);
    --muted: oklch(0.269 0 0);
    --muted-foreground: oklch(0.708 0 0);
    --accent: oklch(0.269 0 0);
    --accent-foreground: oklch(0.985 0 0);
    --destructive: oklch(0.704 0.191 22.216);
    --border: oklch(1 0 0 / 10%);
    --input: oklch(1 0 0 / 15%);
    --ring: oklch(0.556 0 0);
    --success: oklch(0.75 0.15 150);
    --warning: oklch(0.8 0.14 80);
    --danger: oklch(0.72 0.17 22);
    --chart-1: oklch(0.488 0.243 264.376);
    --chart-2: oklch(0.696 0.17 162.48);
    --chart-3: oklch(0.769 0.188 70.08);
    --chart-4: oklch(0.627 0.265 303.9);
    --chart-5: oklch(0.645 0.246 16.439);
    --sidebar: oklch(0.205 0 0);
    --sidebar-foreground: oklch(0.985 0 0);
    --sidebar-primary: oklch(0.488 0.243 264.376);
    --sidebar-primary-foreground: oklch(0.985 0 0);
    --sidebar-accent: oklch(0.269 0 0);
    --sidebar-accent-foreground: oklch(0.985 0 0);
    --sidebar-border: oklch(1 0 0 / 10%);
    --sidebar-ring: oklch(0.556 0 0);
}

@theme inline {
    --font-sans: var(--font-sans);
    --font-mono: var(--font-mono);
    --radius-sm: calc(var(--radius) - 4px);
    --radius-md: calc(var(--radius) - 2px);
    --radius-lg: var(--radius);
    --radius-xl: calc(var(--radius) + 4px);
    --color-background: var(--background);
    --color-foreground: var(--foreground);
    --color-card: var(--card);
    --color-card-foreground: var(--card-foreground);
    --color-popover: var(--popover);
    --color-popover-foreground: var(--popover-foreground);
    --color-primary: var(--primary);
    --color-primary-foreground: var(--primary-foreground);
    --color-secondary: var(--secondary);
    --color-secondary-foreground: var(--secondary-foreground);
    --color-muted: var(--muted);
    --color-muted-foreground: var(--muted-foreground);
    --color-accent: var(--accent);
    --color-accent-foreground: var(--accent-foreground);
    --color-destructive: var(--destructive);
    --color-border: var(--border);
    --color-input: var(--input);
    --color-ring: var(--ring);
    --color-success: var(--success);
    --color-warning: var(--warning);
    --color-danger: var(--danger);
    --color-chart-1: var(--chart-1);
    --color-chart-2: var(--chart-2);
    --color-chart-3: var(--chart-3);
    --color-chart-4: var(--chart-4);
    --color-chart-5: var(--chart-5);
    --color-sidebar: var(--sidebar);
    --color-sidebar-foreground: var(--sidebar-foreground);
    --color-sidebar-primary: var(--sidebar-primary);
    --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
    --color-sidebar-accent: var(--sidebar-accent);
    --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
    --color-sidebar-border: var(--sidebar-border);
    --color-sidebar-ring: var(--sidebar-ring);
}

@layer base {
    * {
        @apply border-border outline-ring/50;
    }
    body {
        @apply bg-background text-foreground font-sans antialiased;
    }
}
```

- [ ] **Step 4: Button (código fonte do shadcn-vue new-york)**

O Button é escrito à mão para o scaffold ser determinista. Os próximos componentes vêm do CLI (plano 4).

`app/components/ui/button/index.ts`:
```ts
import type { VariantProps } from "class-variance-authority"
import { cva } from "class-variance-authority"

export { default as Button } from "./Button.vue"

export const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
    {
        variants: {
            variant: {
                default: "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
                destructive: "bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
                outline: "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
                secondary: "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
                ghost: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
                link: "text-primary underline-offset-4 hover:underline",
            },
            size: {
                default: "h-9 px-4 py-2 has-[>svg]:px-3",
                sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
                lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
                icon: "size-9",
            },
        },
        defaultVariants: { variant: "default", size: "default" },
    },
)

export type ButtonVariants = VariantProps<typeof buttonVariants>
```

`app/components/ui/button/Button.vue`:
```vue
<script setup lang="ts">
import type { PrimitiveProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import type { ButtonVariants } from "."
import { Primitive } from "reka-ui"
import { cn } from "@/lib/utils"
import { buttonVariants } from "."

interface Props extends PrimitiveProps {
    variant?: ButtonVariants["variant"]
    size?: ButtonVariants["size"]
    class?: HTMLAttributes["class"]
}

const props = withDefaults(defineProps<Props>(), { as: "button" })
</script>

<template>
    <Primitive
        data-slot="button"
        :as="as"
        :as-child="asChild"
        :class="cn(buttonVariants({ variant, size }), props.class)"
    >
        <slot />
    </Primitive>
</template>
```

- [ ] **Step 5: Página inicial a usar o Button e o modo escuro**

`app/pages/index.vue` (substituir):
```vue
<script setup lang="ts">
import { MoonIcon, SunIcon } from "@lucide/vue"

definePageMeta({ layout: "public" })

const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === "dark")

function toggleDark() {
    colorMode.preference = isDark.value ? "light" : "dark"
}
</script>

<template>
    <section class="space-y-6">
        <h1 class="text-3xl font-semibold tracking-tight">
            nuxt-base
        </h1>
        <div class="flex gap-2">
            <Button>Primary</Button>
            <Button variant="outline" size="icon" aria-label="Toggle dark mode" @click="toggleDark">
                <MoonIcon v-if="!isDark" />
                <SunIcon v-else />
            </Button>
        </div>
    </section>
</template>
```
A Task 5 troca o texto literal por i18n.

- [ ] **Step 6: Verificar**

Run: `npm run check`
Expected: tudo verde.

Run: `npm run dev` (em background), depois `curl -s http://localhost:3000/ | grep -o 'data-slot="button"' | head -1`
Expected: `data-slot="button"`. Abrir `http://localhost:3000` no browser e confirmar que o botão alterna claro/escuro e que, com a página recarregada, o tema se mantém sem piscar. Parar o dev server.

- [ ] **Step 7: Commit**

```bash
git add -A templates/nuxt-base
git commit -m "feat(template): add tailwind v4 tokens, dark mode and shadcn button"
```

---

### Task 5: i18n (pt-PT e en-US)

**Files:**
- Create: `i18n/i18n.config.ts`
- Modify: `i18n/locales/pt-PT.json`, `i18n/locales/en-US.json`, `app/pages/index.vue`
- Test: `test/unit/locales.test.ts`

**Interfaces:**
- Produces:
  - chaves `common.*`, `errors.*`, `network.*` e `home.*`;
  - `numberFormats`: `decimal`, `currency`, `percent`;
  - `datetimeFormats`: `short`, `long`, `time`.

Os planos seguintes acrescentam chaves nos dois ficheiros ao mesmo tempo, e o teste de paridade garante que não ficam desalinhados.

- [ ] **Step 1: Teste que falha (paridade de chaves)**

`test/unit/locales.test.ts`:
```ts
import { describe, expect, it } from "vitest"
import en from "../../i18n/locales/en-US.json"
import pt from "../../i18n/locales/pt-PT.json"

type Tree = { [key: string]: string | Tree }

function keys(tree: Tree, prefix = ""): string[] {
    return Object.entries(tree).flatMap(([key, value]) =>
        typeof value === "string" ? [`${prefix}${key}`] : keys(value, `${prefix}${key}.`),
    )
}

describe("locales", () => {
    it("pt-PT and en-US have the same keys", () => {
        expect(keys(en as Tree).sort()).toEqual(keys(pt as Tree).sort())
    })
    it("defines the error codes the client falls back to", () => {
        const all = keys(pt as Tree)
        expect(all).toContain("errors.unknown")
        expect(all).toContain("network.unreachable")
    })
})
```

Run: `npm test -- locales`
Expected: FAIL no segundo teste, porque falta `errors.unknown`.

- [ ] **Step 2: Locales**

`i18n/locales/pt-PT.json`:
```json
{
    "common": {
        "save": "Guardar",
        "cancel": "Cancelar",
        "delete": "Apagar",
        "confirm": "Confirmar",
        "close": "Fechar",
        "loading": "A carregar…",
        "toggleDark": "Alternar modo escuro"
    },
    "errors": {
        "unknown": "Ocorreu um erro inesperado.",
        "notFound": "Página não encontrada."
    },
    "network": {
        "unreachable": "Sem ligação ao servidor."
    },
    "home": {
        "title": "Bem-vindo",
        "subtitle": "Base para websites em Nuxt.",
        "cta": "Começar"
    }
}
```

`i18n/locales/en-US.json`:
```json
{
    "common": {
        "save": "Save",
        "cancel": "Cancel",
        "delete": "Delete",
        "confirm": "Confirm",
        "close": "Close",
        "loading": "Loading…",
        "toggleDark": "Toggle dark mode"
    },
    "errors": {
        "unknown": "Something went wrong.",
        "notFound": "Page not found."
    },
    "network": {
        "unreachable": "Cannot reach the server."
    },
    "home": {
        "title": "Welcome",
        "subtitle": "A foundation for Nuxt websites.",
        "cta": "Get started"
    }
}
```

`i18n/i18n.config.ts`:
```ts
export default defineI18nConfig(() => ({
    fallbackLocale: "pt-PT",
    numberFormats: {
        "pt-PT": {
            decimal: { style: "decimal", maximumFractionDigits: 2 },
            currency: { style: "currency", currency: "EUR" },
            percent: { style: "percent", maximumFractionDigits: 1 },
        },
        "en-US": {
            decimal: { style: "decimal", maximumFractionDigits: 2 },
            currency: { style: "currency", currency: "EUR" },
            percent: { style: "percent", maximumFractionDigits: 1 },
        },
    },
    datetimeFormats: {
        "pt-PT": {
            short: { day: "2-digit", month: "2-digit", year: "numeric" },
            long: { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" },
            time: { hour: "2-digit", minute: "2-digit" },
        },
        "en-US": {
            short: { day: "2-digit", month: "2-digit", year: "numeric" },
            long: { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" },
            time: { hour: "2-digit", minute: "2-digit" },
        },
    },
}))
```

- [ ] **Step 3: Página com i18n**

`app/pages/index.vue` (substituir):
```vue
<script setup lang="ts">
import { MoonIcon, SunIcon } from "@lucide/vue"

definePageMeta({ layout: "public" })

const { t, locale, locales, setLocale } = useI18n()
const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === "dark")

useHead({ title: () => t("home.title") })

function toggleDark() {
    colorMode.preference = isDark.value ? "light" : "dark"
}
</script>

<template>
    <section class="space-y-6">
        <div class="space-y-2">
            <h1 class="text-3xl font-semibold tracking-tight">
                {{ t("home.title") }}
            </h1>
            <p class="text-muted-foreground">
                {{ t("home.subtitle") }}
            </p>
        </div>
        <div class="flex flex-wrap gap-2">
            <Button>{{ t("home.cta") }}</Button>
            <Button variant="outline" size="icon" :aria-label="t('common.toggleDark')" @click="toggleDark">
                <MoonIcon v-if="!isDark" />
                <SunIcon v-else />
            </Button>
            <Button
                v-for="item in locales"
                :key="item.code"
                :variant="item.code === locale ? 'secondary' : 'ghost'"
                @click="setLocale(item.code)"
            >
                {{ item.name }}
            </Button>
        </div>
    </section>
</template>
```

- [ ] **Step 4: Verificar**

Run: `npm run check`
Expected: tudo verde, incluindo os 2 testes de locales.

Run: `npm run dev`, depois `curl -s http://localhost:3000/ | grep -o '<html[^>]*>'`
Expected: contém `lang="pt-PT"`. No browser, clicar em "English" muda os textos e o idioma mantém-se depois de recarregar (cookie `i18n_locale`). Parar o dev server.

- [ ] **Step 5: Commit**

```bash
git add -A templates/nuxt-base
git commit -m "feat(template): add i18n with pt-PT default and en-US"
```

---

### Task 6: Base de dados, migrações e baseline

**Files:**
- Create: `drizzle.config.ts`, `server/db/schema/settings.ts`, `server/db/schema/index.ts`, `server/db/index.ts`, `server/utils/db.ts`, `scripts/lib/baseline.mjs`, `scripts/baseline-migrations.mjs`, `scripts/wait-for-db.mjs`, `drizzle/` (gerado)
- Test: `test/unit/baseline.test.ts`

**Interfaces:**
- Produces:
  - `useDb(): MySql2Database<typeof schema>`, auto-importado no servidor via `server/utils/db.ts`;
  - tabela `settings(key varchar(128) PK, value json, updated_at timestamp)`;
  - `decideBaseline({ tables: string[], historyCount: number, baselineTables: string[] }): { action: "none", reason: "history" | "empty" } | { action: "record" } | { action: "refuse", missing: string[] }`;
  - convenção: um ficheiro por domínio em `server/db/schema/`, re-exportado em `index.ts`.

- [ ] **Step 1: Teste que falha**

`test/unit/baseline.test.ts`:
```ts
import { describe, expect, it } from "vitest"
import { decideBaseline } from "../../scripts/lib/baseline.mjs"

const baselineTables = ["settings", "users"]

describe("decideBaseline", () => {
    it("does nothing when migration history exists", () => {
        expect(decideBaseline({ tables: ["__drizzle_migrations", "settings"], historyCount: 3, baselineTables }))
            .toEqual({ action: "none", reason: "history" })
    })
    it("does nothing on an empty database", () => {
        expect(decideBaseline({ tables: [], historyCount: 0, baselineTables }))
            .toEqual({ action: "none", reason: "empty" })
    })
    it("treats an empty history table as no history", () => {
        expect(decideBaseline({ tables: ["__drizzle_migrations"], historyCount: 0, baselineTables }))
            .toEqual({ action: "none", reason: "empty" })
    })
    it("records the baseline when every baseline table exists", () => {
        expect(decideBaseline({ tables: ["settings", "users", "extra"], historyCount: 0, baselineTables }))
            .toEqual({ action: "record" })
    })
    it("refuses when tables exist but some baseline tables are missing", () => {
        expect(decideBaseline({ tables: ["settings"], historyCount: 0, baselineTables }))
            .toEqual({ action: "refuse", missing: ["users"] })
    })
})
```

Run: `npm test -- baseline`
Expected: FAIL, "Failed to resolve import".

- [ ] **Step 2: Lógica pura**

`scripts/lib/baseline.mjs`:
```js
/**
 * Decides what a database needs before `drizzle-kit migrate` runs.
 *
 * - history: __drizzle_migrations has rows, so migrate applies what is pending.
 * - empty: no app tables, so migrate builds everything from 0000.
 * - record: tables exist with no history (created by `push`); mark 0000 as applied.
 * - refuse: tables exist but do not match 0000; a human must look.
 *
 * @param {{ tables: string[], historyCount: number, baselineTables: string[] }} input
 */
export function decideBaseline({ tables, historyCount, baselineTables }) {
    if (historyCount > 0) return { action: "none", reason: "history" }
    const appTables = tables.filter(name => name !== "__drizzle_migrations")
    if (appTables.length === 0) return { action: "none", reason: "empty" }
    const present = new Set(appTables)
    const missing = baselineTables.filter(name => !present.has(name))
    if (missing.length > 0) return { action: "refuse", missing }
    return { action: "record" }
}
```

Run: `npm test -- baseline`
Expected: PASS, 5 testes.

- [ ] **Step 3: Schema, cliente e config do drizzle**

`server/db/schema/settings.ts`:
```ts
import { json, mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core"

/** Key/value overrides for env defaults. Values are validated per key with zod on read. */
export const settings = mysqlTable("settings", {
    key: varchar("key", { length: 128 }).primaryKey(),
    value: json("value").notNull(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
})
```

`server/db/schema/index.ts`:
```ts
export * from "./settings"
```

`server/db/index.ts`:
```ts
import type { MySql2Database } from "drizzle-orm/mysql2"
import { drizzle } from "drizzle-orm/mysql2"
import mysql from "mysql2/promise"
import * as schema from "./schema"

export type Db = MySql2Database<typeof schema>

let instance: Db | undefined

/** Lazily opens one pool per process, so importing this never needs a database. */
export function useDb(): Db {
    if (!instance) {
        const url = process.env.DATABASE_URL
        if (!url) throw new Error("DATABASE_URL is not set")
        const pool = mysql.createPool({ uri: url, connectionLimit: 10 })
        instance = drizzle(pool, { schema, mode: "default" })
    }
    return instance
}
```

`server/utils/db.ts`:
```ts
export { useDb } from "../db"
export type { Db } from "../db"
```

`drizzle.config.ts`:
```ts
import { defineConfig } from "drizzle-kit"

try {
    process.loadEnvFile(".env")
}
catch {
    // No .env (e.g. inside Docker): the variables are already in the environment.
}

export default defineConfig({
    schema: "./server/db/schema/index.ts",
    out: "./drizzle",
    dialect: "mysql",
    dbCredentials: { url: process.env.DATABASE_URL ?? "" },
})
```

- [ ] **Step 4: Gerar a migração 0000**

Run: `npx drizzle-kit generate --name init`
Expected: cria `drizzle/0000_init.sql` com `CREATE TABLE \`settings\`` e `drizzle/meta/_journal.json`. Abrir o SQL e confirmar que só cria `settings`.

- [ ] **Step 5: Scripts de arranque da DB**

`scripts/wait-for-db.mjs`:
```js
import mysql from "mysql2/promise"

const url = process.env.DATABASE_URL
if (!url) {
    console.error("[wait-for-db] DATABASE_URL is not set.")
    process.exit(1)
}

const attempts = Number(process.env.DB_WAIT_ATTEMPTS ?? 60)
for (let i = 1; i <= attempts; i++) {
    try {
        const connection = await mysql.createConnection(url)
        await connection.query("SELECT 1")
        await connection.end()
        console.log("[wait-for-db] Database is ready.")
        process.exit(0)
    }
    catch {
        console.log(`[wait-for-db] Not ready (${i}/${attempts}), retrying in 2s...`)
        await new Promise(resolve => setTimeout(resolve, 2000))
    }
}
console.error("[wait-for-db] Gave up waiting for the database.")
process.exit(1)
```

`scripts/baseline-migrations.mjs`:
```js
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import mysql from "mysql2/promise"
import { decideBaseline } from "./lib/baseline.mjs"

// Brings a database created by `drizzle-kit push` under migration control, so
// `drizzle-kit migrate` can run unattended on every deploy. See lib/baseline.mjs.

const drizzleDir = join(dirname(fileURLToPath(import.meta.url)), "..", "drizzle")
const journal = JSON.parse(readFileSync(join(drizzleDir, "meta", "_journal.json"), "utf8"))
const baseline = journal.entries.find(entry => entry.idx === 0)
if (!baseline) {
    console.error("[baseline] drizzle/meta/_journal.json has no entry 0.")
    process.exit(1)
}

const baselineSql = readFileSync(join(drizzleDir, `${baseline.tag}.sql`), "utf8")
// The same hash drizzle-kit stores: sha256 over the raw file.
const baselineHash = createHash("sha256").update(baselineSql).digest("hex")
const baselineTables = [...baselineSql.matchAll(/CREATE TABLE `([^`]+)`/g)].map(match => match[1])

const url = process.env.DATABASE_URL
if (!url) {
    console.error("[baseline] DATABASE_URL is not set.")
    process.exit(1)
}

const connection = await mysql.createConnection(url)
try {
    const [rows] = await connection.query(
        "SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE()",
    )
    const tables = rows.map(row => row.name)
    let historyCount = 0
    if (tables.includes("__drizzle_migrations")) {
        const [[{ count }]] = await connection.query("SELECT COUNT(*) AS count FROM `__drizzle_migrations`")
        historyCount = Number(count)
    }

    const decision = decideBaseline({ tables, historyCount, baselineTables })
    if (decision.action === "none") {
        console.log(`[baseline] Nothing to do (${decision.reason}).`)
    }
    else if (decision.action === "refuse") {
        console.error(
            `[baseline] Tables exist but ${decision.missing.join(", ")} (created by ${baseline.tag}) `
            + "are missing. Refusing to record the baseline over an unknown schema.",
        )
        process.exitCode = 1
    }
    else {
        await connection.query(
            "CREATE TABLE IF NOT EXISTS `__drizzle_migrations` ("
            + "`id` bigint unsigned NOT NULL AUTO_INCREMENT, `hash` text NOT NULL, "
            + "`created_at` bigint DEFAULT NULL, PRIMARY KEY (`id`), UNIQUE KEY `id` (`id`))",
        )
        await connection.query(
            "INSERT INTO `__drizzle_migrations` (`hash`, `created_at`) VALUES (?, ?)",
            [baselineHash, baseline.when],
        )
        console.log(`[baseline] Existing tables match ${baseline.tag}; recorded it as applied.`)
    }
}
finally {
    await connection.end()
}
```

- [ ] **Step 6: Verificar**

Run: `npm run check`
Expected: tudo verde. O ESLint não deve queixar-se de `drizzle/`, que está ignorado.

- [ ] **Step 7: Commit**

```bash
git add -A templates/nuxt-base
git commit -m "feat(template): add drizzle mysql setup, settings table and migration baseline"
```

---

### Task 7: Infra do servidor (guard de secrets, no-store, health)

**Files:**
- Create: `server/plugins/00.secret-guard.ts`, `server/middleware/04.no-store.ts`, `server/api/health.get.ts`

**Interfaces:**
- Consumes: `isWeakSecret` (Task 3), `useDb` (Task 6).
- Produces:
  - `GET /api/health` devolve `{ status: "ok" | "degraded", version: string, db: "ok" | "down" }`, com HTTP 200 ou 503;
  - `Cache-Control: no-store` em `/api/**`.

O plano 3 acrescenta `realtime` ao health.

- [ ] **Step 1: Implementar**

`server/plugins/00.secret-guard.ts`:
```ts
export default defineNitroPlugin(() => {
    if (!isWeakSecret(process.env.NUXT_SESSION_PASSWORD)) return
    const message = "[secret-guard] NUXT_SESSION_PASSWORD is missing, shorter than 32 characters "
        + "or a placeholder. Generate one with scripts/gen-secrets.ps1 (or .sh)."
    if (import.meta.dev) {
        console.warn(message)
        return
    }
    throw new Error(message)
})
```

`server/middleware/04.no-store.ts`:
```ts
export default defineEventHandler((event) => {
    // API responses carry per-user data; never let a browser or proxy cache them.
    if (event.path.startsWith("/api/")) {
        setResponseHeader(event, "Cache-Control", "no-store")
    }
})
```

`server/api/health.get.ts`:
```ts
import { sql } from "drizzle-orm"

export default defineEventHandler(async (event) => {
    const { public: { appVersion } } = useRuntimeConfig(event)
    let db: "ok" | "down" = "ok"
    try {
        await useDb().execute(sql`SELECT 1`)
    }
    catch {
        db = "down"
    }
    if (db === "down") setResponseStatus(event, 503)
    return { status: db === "ok" ? "ok" : "degraded", version: appVersion, db }
})
```

- [ ] **Step 2: Verificar sem DB**

Run: `npm run check`
Expected: verde.

Run: `npm run dev` sem `DATABASE_URL`, depois `curl -si http://localhost:3000/api/health`
Expected: `HTTP/1.1 503`, `cache-control: no-store`, corpo `{"status":"degraded","version":"0.1.0","db":"down"}`. A consola mostra o aviso do secret-guard. Parar o dev server.

- [ ] **Step 3: Commit**

```bash
git add -A templates/nuxt-base
git commit -m "feat(template): add health endpoint, no-store api header and secret guard"
```

---

### Task 8: Deploy com Docker

**Files:**
- Create: `Dockerfile`, `.dockerignore`, `docker/entrypoint.sh`, `docker-compose.yaml`, `.env.example`, `scripts/gen-secrets.ps1`, `scripts/gen-secrets.sh`

**Interfaces:**
- Consumes: `scripts/wait-for-db.mjs`, `scripts/baseline-migrations.mjs` (Task 6); `/api/health` (Task 7).
- Produces:
  - serviços compose `app`, `db` e `phpmyadmin` (este no perfil `tools`);
  - variáveis `COMPOSE_PROJECT_NAME`, `APP_PORT`, `DB_PORT`, `PMA_PORT`, `MYSQL_*`, `DATABASE_URL`, `NUXT_SESSION_PASSWORD`, `NUXT_SETUP_CODE`, `NUXT_PUBLIC_APP_NAME`.

O plano 2 acrescenta o passo de seed ao entrypoint, entre o migrate e o `exec`.

- [ ] **Step 1: Geradores de secrets**

`scripts/gen-secrets.ps1`:
```powershell
#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Prints NUXT_SESSION_PASSWORD and NUXT_SETUP_CODE lines for .env.
.DESCRIPTION
    Only the two env lines go to the output stream, so `./scripts/gen-secrets.ps1 >> .env`
    appends exactly them. Commentary goes to the host stream.
#>
[CmdletBinding()]
param([ValidateRange(2, 12)][int]$SetupCodeGroups = 3)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$bytes = [byte[]]::new(48)
[System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
$sessionPassword = [Convert]::ToBase64String($bytes)

# No 0/O/1/I/L: the setup code is typed by hand once.
$alphabet = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
$groups = foreach ($i in 1..$SetupCodeGroups) {
    -join (1..5 | ForEach-Object {
        $alphabet[[System.Security.Cryptography.RandomNumberGenerator]::GetInt32(0, $alphabet.Length)]
    })
}
$setupCode = $groups -join '-'

Write-Host 'Add these lines to .env (changing the session password logs everyone out):' -ForegroundColor Cyan
Write-Output "NUXT_SESSION_PASSWORD=`"$sessionPassword`""
Write-Output "NUXT_SETUP_CODE=`"$setupCode`""
```

`scripts/gen-secrets.sh`:
```sh
#!/bin/sh
# Prints NUXT_SESSION_PASSWORD and NUXT_SETUP_CODE lines for .env.
# Only the two lines go to stdout: `./scripts/gen-secrets.sh >> .env`.
set -e
session=$(openssl rand -base64 48 | tr -d '\n')
# No 0/O/1/I/L: the setup code is typed by hand once.
code=$(LC_ALL=C tr -dc '23456789ABCDEFGHJKMNPQRSTUVWXYZ' </dev/urandom | head -c 15 | sed 's/.\{5\}/&-/g; s/-$//')
echo "Add these lines to .env (changing the session password logs everyone out):" >&2
echo "NUXT_SESSION_PASSWORD=\"$session\""
echo "NUXT_SETUP_CODE=\"$code\""
```

- [ ] **Step 2: `.env.example`**

```dotenv
# ---- Docker Compose ----
COMPOSE_PROJECT_NAME=nuxt-base
# Host ports; change them to run several projects side by side.
APP_PORT=3000
DB_PORT=3306
PMA_PORT=4000
MYSQL_ROOT_PASSWORD=change-me-root
MYSQL_DATABASE=app
MYSQL_USER=app
MYSQL_PASSWORD=change-me

# ---- Without Docker (npm run dev / start) ----
# Points at the compose db (DB_PORT) or any MySQL 8.4. Compose sets its own for the app.
DATABASE_URL=mysql://app:change-me@127.0.0.1:3306/app

# ---- Secrets: ./scripts/gen-secrets.ps1 >> .env (or .sh) ----
NUXT_SESSION_PASSWORD=
NUXT_SETUP_CODE=

NUXT_PUBLIC_APP_NAME=Nuxt Base
```

- [ ] **Step 3: Dockerfile, `.dockerignore` e entrypoint**

`Dockerfile`:
```dockerfile
FROM node:24-slim AS build
WORKDIR /src
COPY package.json package-lock.json ./
# Scripts are skipped here: postinstall runs `nuxt prepare`, which needs the sources.
RUN npm ci --ignore-scripts
COPY . .
ENV NODE_ENV=production
RUN npm run build

FROM node:24-slim AS release
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /src/.output ./.output
# drizzle-kit and mysql2 run at boot (migrations), so node_modules ships too.
COPY --from=build /src/node_modules ./node_modules
COPY --from=build /src/package.json /src/drizzle.config.ts ./
COPY --from=build /src/server/db ./server/db
COPY --from=build /src/drizzle ./drizzle
COPY --from=build /src/scripts ./scripts
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
USER node
EXPOSE 3000
ENTRYPOINT ["/entrypoint.sh"]
```

`.dockerignore`:
```
node_modules
.nuxt
.output
.data
.env
backups
test
*.log
.git
```

`docker/entrypoint.sh`:
```sh
#!/bin/sh
set -e

node /app/scripts/wait-for-db.mjs
# Refuses (exit 1) when existing tables do not match the baseline; set -e stops the boot.
node /app/scripts/baseline-migrations.mjs
echo "[entrypoint] Applying migrations..."
npx drizzle-kit migrate
exec node /app/.output/server/index.mjs
```

Criar `templates/nuxt-base/.gitattributes` com a linha `*.sh text eol=lf`, para o entrypoint manter LF em checkouts no Windows.

- [ ] **Step 4: `docker-compose.yaml`**

```yaml
name: ${COMPOSE_PROJECT_NAME:-nuxt-base}

services:
    app:
        build: .
        ports:
            - "${APP_PORT:-3000}:3000"
        environment:
            DATABASE_URL: mysql://${MYSQL_USER:?set MYSQL_USER}:${MYSQL_PASSWORD:?set MYSQL_PASSWORD}@db:3306/${MYSQL_DATABASE:?set MYSQL_DATABASE}
            NUXT_SESSION_PASSWORD: ${NUXT_SESSION_PASSWORD:?run scripts/gen-secrets}
            NUXT_SETUP_CODE: ${NUXT_SETUP_CODE:-}
            NUXT_PUBLIC_APP_NAME: ${NUXT_PUBLIC_APP_NAME:-Nuxt Base}
        depends_on:
            db:
                condition: service_healthy
        healthcheck:
            # node:slim has no curl.
            test: ["CMD", "node", "-e", "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
            interval: 30s
            timeout: 5s
            retries: 3
            start_period: 30s
        restart: unless-stopped

    db:
        image: mysql:8.4
        # Bound to localhost: reachable for `npm run dev` and backups, not from the network.
        ports:
            - "127.0.0.1:${DB_PORT:-3306}:3306"
        environment:
            MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:?set MYSQL_ROOT_PASSWORD}
            MYSQL_DATABASE: ${MYSQL_DATABASE}
            MYSQL_USER: ${MYSQL_USER}
            MYSQL_PASSWORD: ${MYSQL_PASSWORD}
        volumes:
            - db_data:/var/lib/mysql
        healthcheck:
            test: ["CMD-SHELL", "mysqladmin ping -h localhost -uroot -p\"$$MYSQL_ROOT_PASSWORD\" --silent"]
            interval: 10s
            timeout: 5s
            retries: 10
            start_period: 30s
        restart: unless-stopped

    phpmyadmin:
        image: phpmyadmin:5
        profiles: ["tools"]
        ports:
            - "127.0.0.1:${PMA_PORT:-4000}:80"
        environment:
            PMA_HOST: db
        depends_on:
            - db

volumes:
    db_data:
```

- [ ] **Step 5: Verificar de ponta a ponta**

Requer o Docker a correr. A partir de `templates/nuxt-base`:
```bash
cp .env.example .env
pwsh ./scripts/gen-secrets.ps1 >> .env   # ou: sh ./scripts/gen-secrets.sh >> .env
```
Depois apagar do `.env` as linhas vazias `NUXT_SESSION_PASSWORD=` e `NUXT_SETUP_CODE=` que vieram do exemplo. Se ficassem, a primeira ocorrência (vazia) ganhava.

Run: `docker compose up -d --build`, e esperar até `docker compose ps` mostrar `app` como `healthy` (até ~90 s).
Run: `curl -s http://localhost:3000/api/health`
Expected: `{"status":"ok","version":"0.1.0","db":"ok"}`

Run: `docker compose logs app | grep -E "baseline|migrations"`
Expected: `[baseline] Nothing to do (empty).` e `[entrypoint] Applying migrations...`.

Run: `docker compose restart app`, e depois voltar a ver os logs.
Expected: `[baseline] Nothing to do (history).`, o que prova que o segundo arranque é idempotente.

Run: `docker compose --profile tools up -d phpmyadmin`, e abrir `http://localhost:4000`.
Expected: login do phpMyAdmin, e a tabela `settings` existe em `app`.

Run: `docker compose --profile tools down`
Expected: contentores removidos. O volume fica, e é usado na Task 9.

- [ ] **Step 6: Commit**

```bash
git add -A templates/nuxt-base
git commit -m "feat(template): add docker image, compose stack and secret generators"
```

---

### Task 9: Sem Docker, scripts de operação e exemplos de proxy

**Files:**
- Create: `scripts/docker-clean.ps1`, `scripts/backup.ps1`, `scripts/backup.sh`, `deploy/Caddyfile`, `deploy/nginx.conf`, `deploy/nuxt-base.service`

**Interfaces:**
- Consumes: scripts npm `build`, `start` e `db:migrate` (Task 2), e o serviço `db` do compose (Task 8).

- [ ] **Step 1: Scripts de operação**

`scripts/docker-clean.ps1`:
```powershell
<#
.SYNOPSIS
    Removes this compose project's Docker resources only; nothing global.
.PARAMETER Images
    Also remove images built by this compose file.
.PARAMETER Volumes
    Also remove named volumes. IRREVERSIBLE DATA LOSS; asks first.
.PARAMETER All
    Images + volumes + orphans.
.PARAMETER Yes
    Skip confirmations.
#>
[CmdletBinding()]
param([switch]$Images, [switch]$Volumes, [switch]$All, [switch]$Yes)

$ErrorActionPreference = 'Stop'
Push-Location (Join-Path $PSScriptRoot '..')
try {
    docker info --format '{{.ServerVersion}}' | Out-Null
    if ($All) { $Images = $true; $Volumes = $true }

    $downArgs = @('compose', '--profile', 'tools', 'down', '--remove-orphans')
    if ($Images) { $downArgs += @('--rmi', 'local') }
    if ($Volumes) {
        $answer = if ($Yes) { 'y' } else { Read-Host 'Remove this project''s volumes? ALL DATA IS LOST [y/N]' }
        if ($answer -match '^[yYsS]') { $downArgs += '--volumes' } else { Write-Host 'Volumes kept.' }
    }

    Write-Host "-> docker $($downArgs -join ' ')" -ForegroundColor Yellow
    & docker @downArgs
    docker compose ps -a
}
finally {
    Pop-Location
}
```

`scripts/backup.ps1`:
```powershell
<#
.SYNOPSIS
    Dumps the compose database to backups/<database>-<timestamp>.sql.
.DESCRIPTION
    Dumps inside the container and copies the file out, so PowerShell never re-encodes it.
    Restore: Get-Content file.sql -Raw | docker compose exec -T db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"'
#>
$ErrorActionPreference = 'Stop'
Push-Location (Join-Path $PSScriptRoot '..')
try {
    New-Item -ItemType Directory -Force backups | Out-Null
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $inner = "/tmp/backup-$stamp.sql"
    docker compose exec -T db sh -c "mysqldump -uroot -p`"`$MYSQL_ROOT_PASSWORD`" --single-transaction --routines --triggers `"`$MYSQL_DATABASE`" > $inner"
    docker compose cp "db:$inner" "backups/backup-$stamp.sql"
    docker compose exec -T db rm -f $inner
    Write-Host "Saved backups/backup-$stamp.sql" -ForegroundColor Green
}
finally {
    Pop-Location
}
```

`scripts/backup.sh`:
```sh
#!/bin/sh
# Dumps the compose database to backups/backup-<timestamp>.sql.
# Restore: docker compose exec -T db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' < file.sql
set -e
cd "$(dirname "$0")/.."
mkdir -p backups
stamp=$(date +%Y%m%d-%H%M%S)
inner="/tmp/backup-$stamp.sql"
docker compose exec -T db sh -c "mysqldump -uroot -p\"\$MYSQL_ROOT_PASSWORD\" --single-transaction --routines --triggers \"\$MYSQL_DATABASE\" > $inner"
docker compose cp "db:$inner" "backups/backup-$stamp.sql"
docker compose exec -T db rm -f "$inner"
echo "Saved backups/backup-$stamp.sql"
```

- [ ] **Step 2: Exemplos de proxy e serviço**

`deploy/Caddyfile`:
```
# HTTPS is automatic. WebSocket upgrades are proxied by default.
example.com {
    encode zstd gzip
    reverse_proxy 127.0.0.1:3000 {
        # Streaming responses (assistant SSE) must not be buffered.
        flush_interval -1
    }
}
```

`deploy/nginx.conf`:
```nginx
server {
    listen 443 ssl http2;
    server_name example.com;
    # ssl_certificate ...; ssl_certificate_key ...;

    client_max_body_size 20m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        # WebSocket (/_ws)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 3600s;
        # SSE: the app also sends X-Accel-Buffering: no on streams.
        proxy_buffering off;
    }
}
```

`deploy/nuxt-base.service`:
```ini
# systemd unit for running without Docker. Copy to /etc/systemd/system/, adjust paths, then:
#   systemctl daemon-reload && systemctl enable --now nuxt-base
[Unit]
Description=nuxt-base
After=network.target mysql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/srv/nuxt-base
ExecStartPre=/usr/bin/npm run db:migrate
ExecStart=/usr/bin/npm run start
Restart=on-failure
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

- [ ] **Step 3: Verificar o caminho sem Docker**

Usa só a DB do compose; a app corre no host.

Run: `docker compose up -d db`, e esperar até ficar `healthy`.
Confirmar que `DATABASE_URL` no `.env` usa a porta `DB_PORT` (3306 por defeito) e as credenciais `MYSQL_USER`/`MYSQL_PASSWORD`.

Run: `npm run db:migrate`
Expected: `[baseline] Nothing to do (history).` (a Task 8 já migrou este volume), seguido do drizzle-kit sem migrações pendentes.

Run: `npm run build && npm run start` (em background), depois `curl -s http://localhost:3000/api/health`
Expected: `{"status":"ok","version":"0.1.0","db":"ok"}`. Parar o servidor.

Run: `pwsh ./scripts/backup.ps1`
Expected: `Saved backups/backup-<stamp>.sql`, com um ficheiro que contém `CREATE TABLE \`settings\``.

Run: `pwsh ./scripts/docker-clean.ps1 -Volumes -Yes`
Expected: contentores e volume removidos.

- [ ] **Step 4: Commit**

```bash
git add -A templates/nuxt-base
git commit -m "feat(template): add no-docker run path, backup/clean scripts and proxy examples"
```

---

### Task 10: Documentação do template

**Files:**
- Create: `templates/nuxt-base/README.md`, `templates/nuxt-base/CLAUDE.md`

- [ ] **Step 1: `README.md`**

````markdown
# nuxt-base

Nuxt 4 full-stack foundation: Tailwind v4 + shadcn-vue, i18n (pt-PT/en-US), dark mode,
MySQL 8.4 + Drizzle migrations. Auth, permissions and realtime come next.

## Quick start (Docker)

```bash
cp .env.example .env
pwsh ./scripts/gen-secrets.ps1 >> .env     # or: sh ./scripts/gen-secrets.sh >> .env
# delete the empty NUXT_SESSION_PASSWORD= / NUXT_SETUP_CODE= lines copied from the example
docker compose up -d --build
curl http://localhost:3000/api/health
```

phpMyAdmin: `docker compose --profile tools up -d phpmyadmin` → http://localhost:4000

Run several projects side by side by changing `COMPOSE_PROJECT_NAME`, `APP_PORT`,
`DB_PORT` and `PMA_PORT` in `.env`.

## Without Docker

Needs Node 24 and a MySQL 8.4 (the compose `db` service works: `docker compose up -d db`).

```bash
npm install
npm run db:migrate
npm run dev                 # http://localhost:3000
# production
npm run build && npm run start
```

`deploy/nuxt-base.service` is a systemd unit; on Windows wrap `npm run start` with NSSM.

## Database changes

1. Edit `server/db/schema/<domain>.ts` (export it from `schema/index.ts`).
2. `npm run db:generate -- --name <what-changed>` and **read the generated SQL**.
3. Commit the migration. The container applies it on boot; without Docker run `npm run db:migrate`.

Never run `drizzle-kit push` against a real database.

## Operations

- Backup: `pwsh ./scripts/backup.ps1` → `backups/` (git-ignored).
- Clean this project's Docker resources: `pwsh ./scripts/docker-clean.ps1 [-Images] [-Volumes] [-All]`.
- Reverse proxy examples: `deploy/Caddyfile`, `deploy/nginx.conf`.

## Checks

`npm run check` = lint + typecheck + unit tests.
````

- [ ] **Step 2: `CLAUDE.md`**

```markdown
# nuxt-base

## Commands
- `npm run dev` — dev server (loads .env)
- `npm run check` — lint + typecheck + unit tests; must pass before commit
- `npm run db:generate -- --name x` — new migration from schema; review the SQL
- `npm run db:migrate` — apply migrations (baseline-aware)
- `docker compose up -d --build` — full stack

## Layout
- `app/` pages, layouts, components (`ui/` = shadcn, generated; `app/` = foundation)
- `server/api/<resource>/` thin handlers; `server/services/` logic; `server/db/schema/<domain>.ts`
- `shared/` pure code used by both sides (tested in `test/unit`)

## Rules
- Errors: `throw fail(status, "domain.code")`; client reads them with `extractApiError`.
- User-facing text only via i18n keys, added to BOTH `i18n/locales/*.json` (a test checks parity).
- Style: 4 spaces, double quotes, no semicolons (`npm run lint:fix`).
- Never `drizzle-kit push` on a real database. Never commit `.env` or `backups/`.

## Gotchas
- Plain `nuxt dev` does not read `.env`; use `npm run dev`.
- `.sh` files must stay LF (see `.gitattributes`) or the container entrypoint fails.
- shadcn-vue CLI may write to `./components`; move new components to `app/components/ui/`.
```

- [ ] **Step 3: Verificação final e commit**

Run: `npm run check`
Expected: verde.

```bash
git add -A templates/nuxt-base
git commit -m "docs(template): add README and CLAUDE.md"
```

---

## Self-review (feita ao escrever)

- **Cobertura do spec para este plano:**

  | Spec | Coberto por |
  |---|---|
  | §2 estrutura do repo | Task 1 |
  | §3 stack | Tasks 2, 4, 5, 6 |
  | §4 estrutura de pastas | Tasks 2, 6, 7 |
  | §4 regra 3 (envelope de erro) | Task 3 |
  | §11 tokens, shim e color-mode | Task 4 (temas `[data-theme]`, cookie de tema e favicon ficam para o plano 4) |
  | §12 `/api/health` e tabela `settings` | Tasks 6, 7 (`getSetting` fica para o plano 2) |
  | §13 i18n | Task 5 |
  | §14 deploy | Tasks 8, 9 (o seed fica para o plano 2) |
  | §16 vitest e `npm run check` | Tasks 2–7 |
  | §17 convenções | Global Constraints e CLAUDE.md |

  §5–§10 e §15 ficam para os planos 2–6.
- **Placeholders:** nenhum. Os valores `example.com` nos exemplos de proxy são intencionais.
- **Consistência de nomes:** `useDb`/`Db`, `fail`, `extractApiError`, `isWeakSecret`, `decideBaseline` e `normalizeText` têm os mesmos nomes em todas as tasks.

## Desvios na execução (2026-09-19)

- **`vue-router ^5.3.1`** em vez de `^4.6.4`: o Nuxt 4.5 depende do v5, e um v4 na raiz parte o `nuxt typecheck` (`vue-router/volar/sfc-route-blocks`).
- **`h3 ^1.15.11`** adicionado como dependência direta. O `@nuxt/eslint` traz o h3 v2 (rc), que ficava na raiz por cima do v1 do Nitro e partia os tipos do servidor.
- **`layouts/blank.vue`** envolve o `<slot />` num `<div>`, porque a regra `vue/no-multiple-template-root` rejeita um slot na raiz.
- **Teste do `cn`** usa uma variável `boolean`, porque `false && "x"` literal viola `no-constant-binary-expression`.
- **Ícone do modo escuro** alterna por CSS (`dark:hidden` / `hidden dark:block`) e não por `v-if` sobre `colorMode.value`. O `v-if` causava um erro de hidratação.
- **i18n:**
  - `useLocaleHead({ seo: false })`;
  - `baseUrl: "http://localhost:3000"` na config, que se sobrepõe com `NUXT_PUBLIC_I18N_BASE_URL`;
  - sem estas duas mudanças, o aviso "I18n baseUrl is required" aparecia sempre.
- **`templates/nuxt-base/.gitattributes`** fixa LF também em `drizzle/**/*.sql`, para o hash das migrações ser igual em todos os sistemas.
- **`gen-secrets.ps1`** escreve o comentário em stderr (`[Console]::Error`). Quando chamado a partir de outra shell, o `Write-Host` ia parar ao stdout e ao `.env`.
- **npm 11:** `npm approve-scripts esbuild unrs-resolver vue-demi`, com o `allowScripts` commitado.
- **Verificação extra:** testado o caminho `record` do baseline (histórico apagado e reinício), que adota a base.
