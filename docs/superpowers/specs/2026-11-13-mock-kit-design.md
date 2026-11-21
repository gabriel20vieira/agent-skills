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

## 8. Adenda: dispositivos, opções e decisões fora da mock (2026-11-13, pedido do utilizador)

- **Três dispositivos sempre.** A barra mostra sempre computador, tablet (768px) e telemóvel
  (390px), e o `shots` captura os três (janelas de 1280, 860 e 520px).
- **Opções por variante.** Além das variantes (A, B, C...), cada variante pode ter opções
  independentes que se ligam e desligam: A com X e Y, B com Y e Z. Mostram combinações do que
  implementar ou deixar de fora. Entram ou não conforme o que o utilizador pedir, caso a caso.
  - `new --options "A:X,Y;B:Y,Z"`; na mock `<mock-option name="X">` ou `option('X')`.
  - Na barra, interruptores das opções da variante ativa.
  - `?options=X,Y` liga exatamente essas, e `shots --variants A --options "X,Y"` captura essa
    combinação (`--options ""` para nenhuma).
- **Decisões fora da mock.** `MockRules` («O que esta mock decide») sai do shell e do modelo.
  O agente escreve no texto as decisões, as variantes e as opções, com prós, contras e a
  recomendação. `mocks.json` pode guardar as decisões para registo.

## 9. Adenda: escolha, responsive, índice e barra (2026-11-13, pedido do utilizador)

- **Escolha.** O utilizador pode dizer no chat a variante e as opções a implementar
  (`choice <slug> --variant B --options "Y"`, origem `chat`). Se não disser, vale o que está
  selecionado na mock: a barra grava cada mudança em `mocks.json` (`choice`) através de
  `POST /_kit/choice` do `serve`, e a página abre na escolha gravada. Sem nada gravado, vale a
  primeira variante com as suas opções. O agente avisa no chat qual é a escolha antes de
  implementar.
- **Layout e responsive.** Cada mock planeia o layout para computador, tablet e telemóvel. O
  frame é um container (`@container`); as mocks usam variantes de container (`@3xl:`, `@5xl:`),
  que seguem o dispositivo escolhido, e não as de viewport (`md:`), que seguem a janela. O
  `check` avisa quando encontra variantes de viewport. Guia em `references/layout.md`.
- **Raiz.** `serve` gera `/` a cada pedido com todas as mocks da pasta, registadas ou não, e a
  escolha de cada uma.
- **Barra.** Duas linhas. Na primeira, o título à esquerda e, à direita, os ecrãs (Computador |
  Tablet | Telemóvel | Estado) e «Repor». Na segunda, à direita, as variantes e as opções da
  variante ativa. O estado simulado abre no botão «Estado»;
  `MockState` sai do shell e o `check` recusa `<mock-state>`.
- **Estado em árvore.** O painel «Estado» mostra o JSON como árvore (`MockJson`): pesquisa em
  chaves e valores (mostra só os resultados e os pais, com destaque), objetos e arrays que
  encolhem e expandem, e «Expandir tudo» / «Encolher tudo». A lógica está em
  `shell/jsonTree.js`, testada em Node.

## 10. Adenda: onde atuam as opções e opções presas à variante (2026-11-17, pedido do utilizador)

- **Problema.** Uma opção pode atuar num ecrã onde o utilizador não está; ao ligá-la, nada
  muda à vista.
- **Onde.** Cada opção declara `where: "Página > Secção > Elemento"` e, quando não está no
  primeiro ecrã, `go(state, mock)`, que leva a mock até lá. A barra tem o botão «Onde», que lista
  as opções da variante ativa com o caminho, a marca «neste ecrã» (quando o `<mock-option>` está
  montado) e «Ir». O `new` escreve `where` com o título da mock; o `check` avisa quando falta.
- **Opções presas à variante.** As opções aparecem só junto da variante selecionada, e cada
  variante guarda o seu estado ligado/desligado, mesmo com nomes iguais. A lógica está em
  `_kit/options.js`, testada em Node, e o `init --update-shell` atualiza-o.

## 11. Adenda: estado arquivada e separadores no índice (2026-11-21, pedido do utilizador)

- **Estados.** `proposta` > `aprovada` > `implementada` ou `arquivada` (`status <slug> arquivada`).
  Arquivar guarda o ficheiro e tira-o da vista; apagar continua a ser só quando o utilizador pede.
- **Índice em separadores.** «Ativas» (proposta e aprovada, e as mocks ainda por registar),
  «Implementadas» e «Arquivadas», cada um com a contagem. As arquivadas só aparecem no seu
  separador; `/#arquivadas` abre-o diretamente.
