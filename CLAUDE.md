# claude-skills

Plugin repo: a Nuxt 4 template (`templates/nuxt-base`) plus skills that use it.

## Rules
- The template is the source of truth. Skills point at its files; they never copy code.
- Any change to the template must keep `npm run check` green (run it in
  `templates/nuxt-base`).
- Design lives in `docs/superpowers/specs/`, plans in `docs/superpowers/plans/`.
- Code and comments in English; user-facing strings via i18n (pt-PT default, en-US).
- Style: 4 spaces, double quotes, no semicolons (enforced by eslint).
- npm only. Never commit `.env`, dumps or tool logs.
