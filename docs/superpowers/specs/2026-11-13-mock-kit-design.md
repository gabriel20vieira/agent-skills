# mock-kit — design

> Plugin que torna as mocks interativas rápidas e coerentes: HTML sem build com Vue 3 e Tailwind por CDN, sempre brancas, no estilo do tema do projeto, com uma biblioteca de componentes que cresce, verificadas no browser e mostradas com capturas.

Updated: 2026-11-13
Sources: plugins/mock-kit/

- **Data:** 2026-11-13
- **Estado:** aprovado pelo utilizador (pedido detalhado, com as alterações abaixo)
- **Âmbito:** novo plugin `mock-kit` no marketplace `gv-agent-skills`, no formato do
  `docs-keeper`.

## 1. Objetivo

Antes de implementar uma funcionalidade grande, o agente apresenta um resumo com decisões
numeradas e uma mock interativa, verifica-a no browser, mostra capturas e espera o «sim» do
utilizador. O plugin torna estas mocks rápidas e coerentes entre si.

## 2. Alterações do utilizador ao pedido original

- **Tailwind em vez de Bootstrap.** Tailwind v4 pela build de browser (`@tailwindcss/browser`),
  e ícones Lucide (os mesmos do template `nuxt-base`).
- **Sempre brancas.** A página e o quadro da mock são brancos e em modo claro, mesmo que o
  projeto tenha modo escuro.
- **No estilo da plataforma.** Se o projeto tem tema, web ou aplicação, a mock usa as suas cores,
  fontes e raios, ou o mais próximo possível. Web: `--from-css` (variáveis em `:root` e blocos
  `@theme`). Aplicação: `--from-tokens` (JSON de design tokens, plano ou aninhado, com `$value`),
  que o agente escreve a partir do tema da app quando ele está em código (Kotlin, Swift, Dart,
  XML).
- **Sempre interativas.** O `check` falha se uma mock não tiver nenhuma interação
  (`@click`, `v-model`, `@submit`, `@input`, `@change`).
- **Capturas.** `shots <slug>` tira capturas com o Chrome ou o Edge da máquina em modo headless,
  em computador e telemóvel e para cada variante. A skill mostra-as sempre ao utilizador com a
  mock.

## 3. Estrutura criada num projeto (`init`)

```
docs/mocks/                      pasta configurável (--dir)
  index.html                     lista as mocks (gerada de mocks.json)
  mocks.json                     { lang, mocks: [{ file, title, date, status, decisions, variants }] }
  _kit/
    versions.json                URLs fixas de Vue, Tailwind e Lucide: o único sítio das versões
    kit.js                       createMock(): monta a app Vue com shell e componentes
    theme.css                    tokens do projeto (:root) e o fundo branco
    components.json              [{ name, file, description, props, slots, example, usedBy, unused }]
    components/                  um .js por componente (ES module, template em string)
    shell/                       componentes base do plugin
  _shots/                        capturas (.png) de cada mock
  <slug>.html                    uma mock
```

Cada mock tem no `<head>` um bloco gerado entre `<!-- mock-kit:head:start -->` e
`<!-- mock-kit:head:end -->`: o `importmap` de `vue`, os scripts de Tailwind e Lucide, a ligação
a `theme.css` e um `<style type="text/tailwindcss">` com `@theme inline` que dá nomes Tailwind
aos tokens (`bg-primary`, `rounded-lg`, `font-sans`). O `index` reescreve este bloco em todas as
mocks: mudar uma versão em `versions.json` ou o tema e correr `index` atualiza tudo.

## 4. Shell

Em `_kit/shell/`, copiados no `init` e atualizáveis com `init --update-shell`:

- `MockBar`: faixa «MOCK», título, abas de variantes, computador/telemóvel, «Repor» e relógio
  simulado opcional.
- `MockFrame`: quadro branco que muda de largura: computador (até 1280px), telemóvel (390px),
  ou uma proporção (`ratio="3:2"`).
- `MockRules`: lista numerada «O que esta mock decide», ligada às decisões do resumo.
- `MockVariant`: mostra o conteúdo da variante ativa.
- `MockToast`, `MockModal` (sem `alert`/`confirm` nativos), `MockState` (botão «Repor» e vista
  do estado).
- `MockStepper`: passos com estado feito, atual e por fazer.
- `MockIcon`: ícone Lucide pelo nome.

A variante e o dispositivo iniciais podem vir do URL (`?variant=B&device=mobile`), o que permite
as capturas por variante.

## 5. Scripts (`node`, sem dependências)

- `init [--dir] [--lang] [--from-css f] [--from-tokens f] [--update-shell]`: idempotente; nunca
  escreve por cima de componentes do projeto nem de `theme.css` sem `--from-*`.
- `theme --from-css f | --from-tokens f`: volta a gerar `theme.css` e os blocos das mocks.
- `new <slug> --title "…" [--variants A,B] [--decisions "a|b"]`: cria a mock e regista-a.
- `component <Nome> --desc "…"`: cria `components/<Nome>.js` e regista-o.
- `index`: regenera `index.html`, os blocos de cabeçalho e o `usedBy` dos componentes.
- `check`: o mesmo sem escrever. Falha com ficheiros em falta, nomes repetidos, mocks sem
  interação ou blocos desatualizados. Componentes sem uso são aviso, não erro.
- `used <slug>`: componentes que uma mock usa.
- `status <slug> proposta|aprovada|implementada`: muda o estado.
- `serve [--port 8765]`: servidor estático só em `127.0.0.1`, recusa `..`, e mostra a entrada
  `mocks` para `.claude/launch.json`.
- `shots <slug> [--port] [--browser caminho]`: capturas em `_shots/`.

## 6. Skill

Resumo e decisões numeradas, `init` se faltar o kit, ler `components.json` antes de escrever,
componentes novos e reutilizáveis com `component`, `new` e escrever a mock (dados realistas,
estado simulado, tudo clicável, variantes quando há escolha), servir e verificar no browser
(caminhos principais, consola sem erros, computador e telemóvel), `shots` e mostrar as capturas,
iterar até ao «sim», depois `status aprovada` e, implementado, `status implementada`.

## 7. Fora de âmbito

Gerar código de produção a partir da mock. Ler temas de apps automaticamente a partir de código
nativo: o agente traduz para tokens JSON.
