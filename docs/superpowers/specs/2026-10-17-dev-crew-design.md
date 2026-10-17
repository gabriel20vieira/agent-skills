# dev-crew — design

- **Data:** 2026-10-17
- **Estado:** proposta para revisão
- **Âmbito:** novo plugin `dev-crew` no marketplace `claude-skills`, separado do `web-foundation`

## 1. Objetivo

Desenvolver, monitorizar e verificar trabalho de código com uma equipa de subagents, em que
cada modelo faz aquilo em que é bom e custa o que deve custar:

- **Opus** coordena e julga: planeia, divide, escreve briefs, revê e aceita ou rejeita.
- **Sonnet** desenvolve: implementa, escreve os testes e corrige.
- **Haiku** testa e verifica de forma mecânica: corre checks e testes, localiza código e
  responde "passou ou falhou, e onde".

Uma dashboard no claude.ai mostra o estado ao vivo: um sumário por agente, quantos estão a
correr por modelo e os limites máximos de cada modelo, editáveis na própria página.

### Objetivos

- Uma hierarquia real (sem achatar): `Opus principal > [Opus × n] > [Sonnet × n] > [Haiku × n]`,
  com o `n` de cada nível a variar conforme o trabalho.
- Verificação em duas camadas: o Haiku verifica de forma objetiva (check e testes) e o Opus
  verifica a qualidade (diff e testes).
- Uma dashboard ao vivo, persistente e reutilizável entre corridas do mesmo projeto.
- Limites por modelo definidos na dashboard e respeitados pelos agentes.

### Fora de âmbito

- Bloqueio rígido dos limites, por exemplo com um hook `PreToolUse` na tool `Agent`. Os limites
  são uma regra que os agentes seguem. Fica para o futuro, se fizer falta.
- Custo exato. A dashboard mostra tokens por agente e uma estimativa de custo.
- Mais de três níveis de subagents, que é o limite por defeito do Claude Code.
- Qualquer ligação ao template Nuxt. O `dev-crew` serve qualquer projeto.

### Anti-objetivos (falha, mesmo que funcione)

- O Haiku decidir se o código está bem feito. Ele só reporta factos.
- Uma dashboard que mostra agentes "a correr" que já terminaram, ou que esconde falhas.
- Uma orquestração que gasta mais em coordenação do que no trabalho. Tarefas pequenas fazem-se
  sem equipa (ver 3.5).
- Logs completos a subir pela hierarquia: cada nível devolve um resumo curto.

## 2. Factos da plataforma (confirmados na documentação do Claude Code, outubro 2026)

- Um subagent pode lançar os seus próprios subagents até **3 níveis** abaixo da conversa
  principal (`CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH`). No último nível, a tool `Agent` deixa de
  estar disponível.
- No máximo **20 subagents em simultâneo** por defeito (`CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`).
  O 21.º falha com `Concurrent subagent limit reached`.
- Os agents de um plugin vivem em `agents/*.md` e chamam-se `<plugin>:<nome>`. O frontmatter
  aceita `model` (`opus`, `sonnet`, `haiku`, um ID completo ou `inherit`), `effort`, `tools`,
  `disallowedTools` e `maxTurns`. Os agents de plugin **ignoram** `hooks`, `mcpServers` e
  `permissionMode`.
- A chamada da tool `Agent` aceita `model` e `effort` por invocação, que se sobrepõem ao
  frontmatter.
- Quando um subagent em background termina, o pai recebe uma notificação que inclui o total
  de tokens desse subagent (`subagent_tokens`).
- Há hooks `SubagentStart` e `SubagentStop` com `agent_id` e `agent_type`, mas sem modelo nem
  agente pai. Não são usados nesta versão.

## 3. Hierarquia e papéis

| Nível | Agent | Modelo | Effort | Pode lançar | Escreve código |
|---|---|---|---|---|---|
| 0 | sessão principal (a skill corre aqui) | Opus | da sessão | coordenadores, checkers | não (só o plano e a revisão final) |
| 1 | `dev-crew:coordinator` | `opus` | `high` | developers, checkers | não |
| 2 | `dev-crew:developer` | `sonnet` | `medium` | checkers | sim |
| 3 | `dev-crew:checker` | `haiku` | `low` | ninguém | **não** (sem `Edit`/`Write`) |

O checker pode ser lançado a partir de qualquer nível: o coordenador usa-o para localizar
código antes de escrever briefs, e o developer usa-o para correr o check. Lançado pelo
coordenador, fica no nível 2, o que é permitido.

### 3.1 Sessão principal (Opus, nível 0)

1. Abre ou reutiliza a dashboard do projeto (secção 6) e cria a corrida.
2. Percebe o pedido. Se não houver plano, escreve um curto: áreas e tasks por área.
3. Divide em **áreas** independentes (por exemplo backend e UI), com uma regra: duas áreas
   nunca tocam os mesmos ficheiros. Prepara uma worktree por área (secção 4) e lança um coordenador por área, dentro do limite de Opus.
4. Acompanha: cada coordenador devolve um resumo quando termina.
5. **Verificação final:** junta os branches das áreas (secção 4), corre o check e os testes do projeto todo (através de um checker),
   revê o diff completo e marca a corrida como aceite ou rejeitada, com veredicto.

### 3.2 Coordenador (Opus, nível 1)

1. Recebe a área, as tasks e os ficheiros que pode tocar.
2. Para cada task, escreve um **brief fechado** (3.6) e lança um developer, dentro do limite
   de Sonnet. As tasks que tocam ficheiros comuns correm em série.
3. Quando um developer termina, revê o diff e o resultado do check dessa task. Aceita (e faz commit no branch da área), ou
   devolve com correções concretas (um novo developer, com o brief e os comentários).
4. No fim, devolve à sessão principal um resumo da área: tasks, veredictos, ficheiros tocados,
   riscos.

### 3.3 Developer (Sonnet, nível 2)

1. Implementa a task do brief e escreve os testes desse código.
2. Lança um checker para correr o check e os testes indicados no brief.
3. Se falhar, corrige e volta a lançar o checker. Ao fim de **3 voltas** sem passar, para e
   devolve ao coordenador o que falha e o que tentou.
4. Devolve: ficheiros alterados, testes criados e último resultado do check.

### 3.4 Checker (Haiku, nível 3)

- Dois modos, indicados no brief:
  - **check:** corre os comandos indicados e devolve `passou` ou `falhou`, com cada falha em
    `ficheiro:linha` e a mensagem exata, sem despejar o log.
  - **localizar:** responde a "onde está X" ou "quem usa Y" com uma lista de `ficheiro:linha`.
- Não edita ficheiros, não opina sobre qualidade e não sugere correções.
- Ferramentas: `Read`, `Grep`, `Glob`, `Bash`. Sem `Edit`, `Write` nem `Agent`.

### 3.5 Quando não usar a equipa

Uma alteração pequena (um ou dois ficheiros, sem ambiguidade) é feita pela sessão principal
diretamente, ou por um único developer sem coordenador. A skill di-lo explicitamente, para não
pagar coordenação em trabalho trivial.

### 3.6 Brief (formato comum a todos os níveis)

```
Task: <uma frase>
Ficheiros que podes tocar: <lista>
Ficheiros que não podes tocar: <lista ou "todos os outros">
Feito quando: <critérios verificáveis>
Check: <comandos exatos, por exemplo npm run check && npm run test:api>
Devolve: <formato do resumo>
Dashboard: corrida <runId>, agente pai <agentId>
```

## 4. Isolamento e git (decidido pelo utilizador)

Uma worktree git por área. O coordenador faz commit no branch da área, e a sessão principal
junta e verifica. Push e PR ficam sempre com o utilizador.

- **Ponto de partida:** a corrida parte do `HEAD` atual. Se houver alterações por commitar, a
  sessão principal para e pergunta ao utilizador (commit ou stash) antes de começar, porque as
  worktrees não as veriam.
- **Branches:** um branch de corrida `crew/<runId>/run`, criado a partir do commit de partida, e um
  branch por área `crew/<runId>/<area>`, com a sua worktree fora do repositório (por exemplo
  `../<repo>-crew/<runId>/<area>`, e a do merge em `../<repo>-crew/<runId>/run`).
- **Preparar a worktree:** a sessão principal corre o comando de instalação do projeto em cada
  worktree (por exemplo `npm ci`) antes de lançar o coordenador, e passa o caminho absoluto no
  brief. Todos os agentes dessa área trabalham nesse caminho.
- **Dentro da área:** os developers só correm em paralelo quando tocam ficheiros diferentes.
  Os checks por task correm na worktree da área.
- **Commits:** o coordenador faz um commit por task aceite, no branch da área. Os developers e
  os checkers nunca fazem commit.
- **Juntar:** no fim, a sessão principal faz merge de cada branch de área no branch da corrida (`crew/<runId>/run`, numa worktree própria),
  corre o check completo nesse branch (através de um checker) e revê o diff contra o commit de
  partida. Como as áreas não partilham ficheiros, não se esperam conflitos. Se houver algum, a
  sessão principal resolve-o se for trivial, ou pergunta.
- **Limpeza:** depois do merge, as worktrees das áreas são removidas e os branches ficam.
- **Nunca:** push, PR, merge para o branch de trabalho do utilizador, nem apagar branches. A
  sessão principal termina a dizer qual é o branch da corrida e o que propõe.
- **Builder:** confirmar no spike se `isolation: worktree` no frontmatter do coordenador serve
  (incluindo se os seus filhos herdam a worktree) ou se as worktrees são criadas pela sessão
  principal com `git worktree add`, como descrito acima.

## 5. Limites (regra simples)

- Os limites guardam-se na dashboard: um máximo de agentes **a correr ao mesmo tempo** por
  modelo. Valores por defeito: Opus 2, Sonnet 4, Haiku 6. Somados à sessão principal ficam
  abaixo do teto de 20.
- Antes de lançar um agente, quem o lança lê os limites e conta os agentes desse modelo com
  estado `running` na corrida. No limite, espera que um dos seus termine e só depois lança.
- A contagem pode falhar por pouco quando dois coordenadores lançam ao mesmo tempo. Aceita-se:
  é uma regra, não um bloqueio.
- Se a dashboard não estiver disponível, valem os valores por defeito.

## 6. Dashboard

### 6.1 O que é

Uma página Artifact (claude.ai), privada por defeito, com a capability `db` (dados fora da
página, que o Claude escreve e a página lê ao vivo com `onSnapshot`) e `user`. O HTML vive no
plugin, em `plugins/dev-crew/dashboard/index.html`, e é publicado tal como está: a skill não
gera nem copia HTML.

- **Uma dashboard por projeto.** O URL fica em `.claude/dev-crew.local.json` no projeto. Este
  ficheiro é local e vai para o `.gitignore`.
- Na primeira utilização, a skill publica a página e guarda o URL. Nas seguintes, reutiliza-a.
  Quando a versão da página no plugin mudar, republica no mesmo URL.

### 6.2 Dados (`db`)

- `config/limits`: `{ opus, sonnet, haiku }`. É escrito pela página (campos editáveis) e lido
  pelos agentes.
- `runs/<runId>`: `{ title, status (running|accepted|rejected|stopped), startedAt, endedAt,
  verdict }`.
- `agents/<agentId>`: `{ runId, parentId, model, role (main|coordinator|developer|checker),
  area, task, status, loops, lastCheck: { ok, failures: [ { file, line, message } ] },
  verdict, summary, tokens, startedAt, updatedAt }`.

Estados de um agente: `queued`, `running`, `fixing`, `passed`, `failed`, `accepted`,
`rejected`, `done`.

O `agentId` é gerado por quem lança o agente (`<role>-<n>`) e vai no brief. Assim, o agente
lançado sabe qual é a sua linha.

### 6.3 O que a página mostra

- **Topo:** para cada modelo, `a correr / limite`, com o limite editável. Mostra também os
  totais da corrida: agentes, tokens e custo estimado.
- **Árvore:** sessão principal > coordenadores > developers > checkers, com cada nó num cartão:
  modelo, papel, task, estado, voltas, último check e veredicto. Ao clicar, abre o sumário e
  as falhas.
- **Seletor de corrida**, com a mais recente por defeito.
- O custo estimado usa os preços do output da tabela de modelos. Fica marcado como
  "estimativa", porque os tokens chegam somados, sem separar input de output.
- Funciona em telemóvel, com tema claro e escuro.

### 6.4 Quem escreve

- Cada agente atualiza a **sua própria linha** em `agents/<agentId>` (estado, voltas, check,
  sumário). Quem lança um agente cria a linha dele (`queued`) e, quando ele termina, escreve os
  `tokens` da notificação.
- **Risco a confirmar primeiro:** não está confirmado que os subagents (sobretudo nos níveis 2
  e 3) tenham acesso à tool `ArtifactData`. O plano começa por um spike que verifica isto.
  Se não tiverem, o fallback é este: cada agente devolve o seu estado no resumo e o pai
  escreve-o. O nível mais alto com acesso faz a escrita por todos abaixo dele, à custa de a
  dashboard atualizar por etapas e não ao segundo.

## 7. Estrutura no repo

```
.claude-plugin/marketplace.json     + plugin "dev-crew", source "./plugins/dev-crew"
plugins/dev-crew/
  .claude-plugin/plugin.json
  README.md
  skills/dev-crew/SKILL.md          o fluxo da sessão principal (3.1), limites e brief
  skills/dev-crew/references/       brief.md, dashboard.md (esquema db e como publicar)
  agents/coordinator.md
  agents/developer.md
  agents/checker.md
  dashboard/index.html
README.md                           secção da coleção: dois plugins e como instalar cada um
CLAUDE.md                           regras do repo passam a cobrir os dois plugins
```

O `web-foundation` continua na raiz, sem alterações.

## 8. Decisões tomadas pelo Claude (para rever)

- Nome do plugin e da skill: `dev-crew`.
- Uma skill só (`dev-crew`), com referências, em vez de várias skills.
- Um único agent Haiku (`checker`) com dois modos, sem permissões de edição.
- Valores de effort por nível (tabela 3) e limites por defeito (2 / 4 / 6).
- Três voltas de correção antes de escalar.
- Uma dashboard por projeto, com o URL em `.claude/dev-crew.local.json`.
- Tudo o que está na secção 9 (dashboard opcional, quotas no fallback, linhas presas,
  limite de 2 rejeições, nunca reverter automaticamente).
- Spec escrita em português, como a anterior. Código, frontmatter e skills em inglês.

## 9. Falhas e casos-limite

- **Dashboard opcional.** Sem as tools de Artifact (por exemplo com API key, em CI ou noutro
  host), a equipa corre na mesma: o estado vive só nos resumos e a sessão principal mostra uma
  tabela final no chat. Os limites usam os valores por defeito.
- **Publicar a página:** o Artifact só publica ficheiros do diretório de trabalho ou do
  scratchpad. A skill copia `dashboard/index.html` do plugin para o scratchpad no momento de
  publicar. É um passo de publicação, não código copiado para o projeto, por isso não viola a
  regra "skills não copiam código".
- **Aprovações do `ArtifactData`:** as escritas pedem aprovação. O README e a primeira corrida
  explicam como permitir `ArtifactData` nas settings, para os agentes em background não ficarem
  parados à espera de aprovações.
- **Limites sem acesso à dashboard nos subagents** (fallback de 6.4): a sessão principal dá a
  cada coordenador uma quota fixa (por exemplo, "podes ter até 2 Sonnet ao mesmo tempo"),
  calculada a partir dos limites e do número de áreas. O coordenador reparte-a pelos developers.
- **Linhas presas em `running`:** quando a notificação de um filho chega (com sucesso ou com
  erro), o pai fecha a linha dele. No início e no fim de cada corrida, a sessão principal
  marca como `failed` as linhas `running` de corridas anteriores. A página mostra "sem sinal"
  num agente cujo `updatedAt` tenha mais de 10 minutos, e esses agentes não contam para os
  limites.
- **Rejeições:** um coordenador devolve uma task no máximo **2 vezes**. À terceira, escala para
  a sessão principal, que decide ou pergunta ao utilizador. Uma corrida `rejected` **nunca
  reverte nada automaticamente**: as alterações ficam e a sessão principal diz ao utilizador o
  que falhou e o que propõe.

## 10. Deixado ao builder

- Layout e estilo da dashboard, desde que mostre o que está em 6.3.
- O texto exato dos prompts dos agents e da skill, desde que siga os papéis em 3.
- Como a página gera ids e formata datas.

## 11. Adenda: contexto, skills e documentação (2026-10-17, pedido do utilizador)

- **Contexto antes do plano.** A sessão principal lê primeiro o que o projeto já sabe:
  `CLAUDE.md`, README, specs, planos e decisões em `docs/`. Specs e documentação são o input
  mais importante. Depois escolhe, entre as skills e os plugins disponíveis na sessão, as que
  importam para a tarefa (por exemplo, num projeto do template: `web-foundation` mais a
  `web-*` da alteração). Cada brief leva `Skills:` e `Read first:`, e cada agente carrega
  essas skills antes de trabalhar.
- **Scribe (Opus).** Todas as decisões e toda a documentação são escritas por um novo agent,
  `dev-crew:scribe` (Opus, effort `medium`), lançado pela sessão principal: depois do plano,
  depois de cada relatório de coordenador e no fim. Escreve em `docs/` um ficheiro `.md` por
  decisão (`docs/decisions/<data>-<slug>.md`), o registo da corrida (`docs/runs/<runId>.md`) e
  o índice (`docs/README.md`), seguindo o layout do projeto quando já existe um. Se o projeto
  não tiver `CLAUDE.md`, cria-o; se tiver, não o altera e reporta o que falta.
- **Onde escreve.** O scribe faz commit no branch da corrida, na worktree da corrida, que agora
  é criada logo no `start` (`runPath`). Assim, a documentação junta-se ao código no merge.
  Nunca há dois scribes ao mesmo tempo, e o `merge` espera pelo scribe.
- **Limites.** Tal como a sessão principal, o scribe não conta para os limites por modelo.
- Os relatórios do coordenador e do developer passam a ter uma linha `Decisions:`, que a
  sessão principal encaminha para o scribe.
