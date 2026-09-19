# claude-skills — website foundation

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
