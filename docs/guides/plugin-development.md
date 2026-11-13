# Desenvolver os plugins

> Como experimentar, testar e publicar alterações aos plugins deste repo, e o que verificar antes de cada commit.

Updated: 2026-11-13
Sources: .claude-plugin/marketplace.json, plugins/, skills/, docs/settings.md

## Experimentar sem instalar

```bash
claude --plugin-dir . --plugin-dir plugins/dev-crew --plugin-dir plugins/docs-keeper --plugin-dir plugins/mock-kit
```

Lê os ficheiros diretamente: uma alteração aparece ao reiniciar a sessão.

## Instalar a partir da pasta

```bash
claude plugin marketplace add "<caminho do repo>" --scope local
claude plugin install web-foundation@gv-agent-skills
claude plugin install dev-crew@gv-agent-skills
claude plugin install docs-keeper@gv-agent-skills
claude plugin install mock-kit@gv-agent-skills
```

Depois de mudar o repo: `claude plugin marketplace update gv-agent-skills`.

## Antes de cada commit

Os comandos em `checks.beforeCommit` (`docs/settings.md`):

- `node --test skills/*/scripts/*.test.mjs plugins/*/skills/*/scripts/*.test.mjs`
- `npm run check` em `templates/nuxt-base` quando o template mudou.
- Para um módulo, o projeto descartável descrito no `CLAUDE.md`.
- `claude plugin validate .` e `claude plugin validate plugins/<plugin>` (`dev-crew`,
  `docs-keeper`, `mock-kit`) quando um manifesto mudou.
- `node plugins/docs-keeper/skills/docs-keeper/scripts/docs-index.mjs check` para o índice de
  `docs/` no `CLAUDE.md`.

## Integrar

Segue `docs/settings.md`: branch a partir de `main`, PR, merge com merge commit, e o branch
apagado local e no `origin` depois do merge.
