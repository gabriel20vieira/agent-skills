# Skills

One folder per skill, each with a `SKILL.md` (frontmatter `name` + a `description` that
starts with "Use when"). Skills describe the extension points of `templates/nuxt-base` and
never duplicate its code: they name the template files to copy or edit, the rules, and how
to verify. The design is in `docs/superpowers/specs/2026-09-19-website-foundation-design.md`
(section 2).

Paths: `${CLAUDE_PLUGIN_ROOT}/templates/...` when installed as a plugin, `templates/...`
inside this repo. Module skills apply the files in `modules/<name>/`.

A skill that ships a script keeps it in `scripts/` with a `node --test` test next to it.
