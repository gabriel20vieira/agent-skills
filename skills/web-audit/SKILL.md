---
name: web-audit
description: Use before a project built from the web-foundation Nuxt template goes live or after a large change, to review its security - secrets, sessions, permission checks on every handler, input validation, rate limits, realtime topics, headers, dependencies - reporting findings with file and line.
---

# Security audit

A read-only review. Report findings; fix only what the user asks. Each check says what to
run or read and what a failure looks like. Report as a list ordered by severity with
`file:line`, the risk in one sentence and the fix.

## 1. Secrets and config

- `git ls-files | grep -E "\.env$|backups/|\.sql$|\.pem$|\.key$"`: only `.env.example`
  and `drizzle/*.sql` may appear.
- `git log -p --all -S "NUXT_SESSION_PASSWORD=" -- . ':!.env.example'`: no real value ever
  committed.
- `.env.example` has no real values. `nuxt.config.ts` `runtimeConfig` has no secrets
  with non-empty defaults (except in `public`, which is sent to the browser: nothing
  secret there).

## 2. Every handler checks auth and permission

List the handlers and read each:

```bash
find server/api -name "*.ts" | sort
grep -L "assertPermission\|requireUser" $(find server/api -name "*.ts")
```

- Files without `requireUser` must be intentionally public (auth, setup, invites by
  token, public settings, health). Anything else is a finding.
- A write without `assertPermission(user, resource, action)` is a finding, even if the
  page hides the button.
- Checks against role names (`roles.includes("admin")`) instead of the matrix.
- Object-level access: when a resource belongs to a user/organisation, the service must
  filter by owner; `assertPermission` alone only answers "may this role do X at all".

## 3. Input

- Bodies and queries read with `readBodyWith` / `readQueryWith` and a zod schema;
  `readBody` or `getQuery` used raw is a finding.
- Ids via `readIdParam`. No string-built SQL (`sql.raw`, template strings into `sql`
  with user input).
- Response shapes: services select explicit columns; never return `passwordHash`,
  token hashes or other users' emails to roles that should not see them.
- `v-html` in `app/`: `grep -rn "v-html" app` - each use must render trusted or
  sanitised content.

## 4. Sessions and accounts

- Password changes, deactivation and admin resets call `revokeUserSessions`.
- Login, setup and invite acceptance go through `enforceCredentialLimit`; unknown emails
  still hash (`timingDummyHash`).
- `NUXT_SETUP_CODE` empty in production after the first admin.
- Cookie flags: `sameSite: "lax"` in `nuxt.config.ts`; `secure` comes from HTTPS in
  production (check the `Set-Cookie` header on the live site).

## 5. Realtime

- New topics authorised in `authorizeTopic`; nothing returns `true` for arbitrary
  `res:*` topics.
- Published payloads contain ids only: `grep -rn "realtime.publish" server`.

## 6. Limits and headers

- `security.login` and `security.api` values in `/admin/definicoes` are sane.
- File uploads (if any): size limit, type check by content, stored outside `public/`,
  served with `Content-Disposition` and the right type.
- Live site headers (`curl -sI https://<domain>`): HTTPS redirect,
  `Strict-Transport-Security` (set it in the proxy), no `X-Powered-By` leaking versions,
  `Cache-Control: no-store` on `/api/*` responses with personal data.

## 7. Dependencies and build

- `npm audit --omit=dev`: high/critical in runtime dependencies are findings.
- `npm run check` and `npm run test:api` pass.
- The Docker image runs as `USER node` (see `Dockerfile`).

## 8. Operations

- A backup exists and a restore was tested (see `web-deploy`).
- The database port is not reachable from outside the host.
- Audit log (`/admin/auditoria`) records the writes of each resource:
  `grep -rn "audit(" server/services`.

## Output

```
HIGH  server/api/products/[id].delete.ts:4  no assertPermission; any signed-in user can delete. Add assertPermission(actor, "products", "delete").
MED   ...
```

End with what was not checked (e.g. the live site, if no URL was given).
