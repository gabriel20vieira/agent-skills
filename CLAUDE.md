# claude-skills

Plugin marketplace with two plugins:
- `web-foundation` (repo root): a Nuxt 4 template (`templates/nuxt-base`) plus skills that use it.
- `dev-crew` (`plugins/dev-crew`): subagent crew (Opus/Sonnet/Haiku), worktree script, dashboard page.

The template, module and i18n rules below apply to `web-foundation` only.

## Rules
- Working preferences (git cleanup, merge method, who pushes, docs language) are in
  `docs/settings.md`. Follow them; when a value is empty, ask once and write the answer there.
- The template is the source of truth. Skills point at its files; they never copy code.
- Any change to the template must keep `npm run check` green (run it in
  `templates/nuxt-base`).
- Design lives in `docs/superpowers/specs/`, plans in `docs/superpowers/plans/`.
- Code and comments in English; user-facing strings via i18n (pt-PT default, en-US).
- Style: 4 spaces, double quotes, no semicolons (enforced by eslint).
- npm only. Never commit `.env`, dumps or tool logs.
- Modules (`modules/<name>/files`) are copied into projects by
  `skills/web-foundation/scripts/apply-module.mjs`; their core edits live in the module's skill.
  After changing a module, verify it in a throwaway project: `new-project.mjs` + every module +
  the skills' edits + `npm run db:generate`, then `npm run check` and `npm run test:api` there.
- Skill scripts and dashboard logic:
  `node --test skills/*/scripts/*.test.mjs plugins/*/skills/*/scripts/*.test.mjs plugins/*/dashboard/*.test.mjs`.
- `dev-crew`: agent model/effort are pinned in `agents/*.md` frontmatter and checked by
  `plugin.test.mjs`; the dashboard page is published as is, never generated per project.
