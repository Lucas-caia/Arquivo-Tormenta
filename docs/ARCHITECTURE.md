# Arquitetura do Arquivo Tormenta RPG

## Visão geral

O Arquivo Tormenta RPG utiliza uma arquitetura de **monólito modular**. Frontend, API, regras de importação, persistência, integração com Git e integração com Discord pertencem ao mesmo projeto, mas são separados por responsabilidade.

A aplicação possui duas entradas para fichas:

- **Interface web local**, usada para consultar, importar, revisar e administrar o acervo.
- **Bot do Discord**, usado para receber PDFs externos e encaminhá-los para uma fila administrativa antes da importação.

```text
                         ┌──────────────────────┐
                         │      React SPA       │
                         │ Interface local      │
                         └──────────┬───────────┘
                                    │ HTTP / JSON
                                    ▼
                         ┌──────────────────────┐
                         │     Express API      │
                         │ Rotas e middlewares │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │ ImportFichaService   │◄──────────────┐
                         └──────────┬───────────┘               │
                                    │                           │
                      ┌─────────────┼─────────────┐             │
                      ▼             ▼             ▼             │
                   Parser          Diff        Storage          │
                   PDF→JSON                     JSON            │
                                                    ▲            │
                                                    │            │
Discord ─► Bot ─► SubmissionService ─► Quarentena ─► ClamAV ───┘
```

## Frontend

O frontend é uma **SPA em React + TypeScript**, construída com Vite.

A interface é organizada em páginas e componentes reutilizáveis. A navegação utiliza rotas por hash e possui as áreas:

- Dashboard;
- Fichas;
- Importação de PDF;
- Revisões;
- GitHub;
- Configurações.

A comunicação com o backend é centralizada no cliente de API em `src/api`. Estado e operações principais da aplicação são concentrados em hooks, enquanto componentes e páginas cuidam da apresentação.

As preferências de acessibilidade ficam no frontend e incluem aparência, tamanho de texto, contraste e redução de movimento.

```text
src/
├── api/            comunicação HTTP
├── components/     componentes reutilizáveis
├── hooks/          estado e operações da aplicação
├── pages/          áreas principais da interface
├── routing/        navegação por hash
├── settings/       preferências de acessibilidade
└── utils/          utilitários do frontend
```

## Backend

O backend utiliza **Node.js + Express + TypeScript** e expõe uma API REST em `/api`.

As responsabilidades são separadas entre:

- `routes/`: endpoints HTTP;
- `middleware/`: upload, tratamento assíncrono e erros;
- `services/`: casos de uso compartilhados;
- `parser.ts`: extração dos campos do PDF;
- `diff.ts`: comparação entre a ficha atual e uma nova versão;
- `storage.ts`: leitura, escrita, revisão e locks dos arquivos;
- `git/`: configuração, autenticação SSH, preparação de commits e sincronização do acervo;
- `validation.ts`: validações de IDs e arquivos.

O backend também serve o build do frontend em produção.

## Importação de fichas

O `ImportFichaService` é o ponto central do fluxo de importação. Tanto o upload pela interface web quanto uma submissão aprovada pelo Discord utilizam o mesmo serviço.

```text
PDF
 ↓
Validação
 ↓
Parser
 ↓
Ficha estruturada
 ↓
Busca da ficha atual
 ↓
┌───────────────────┬────────────────────┐
│ não existe        │ já existe          │
▼                   ▼
Nova ficha          Comparação
                    ↓
                    Revisão pendente
```

O parser utiliza `pdf-lib` e preserva o mapeamento definido para o modelo de ficha suportado. O PDF é convertido em dados estruturados e o acervo oficial permanece em JSON.

Uma atualização não substitui diretamente uma ficha existente. As diferenças são armazenadas como revisão pendente e precisam ser aplicadas explicitamente.

## Persistência

A persistência é baseada no sistema de arquivos.

```text
data/
├── fichas/              fichas oficiais em JSON
├── revisoes/            revisões pendentes
├── submissions/         metadados da fila do Discord
├── quarantine/          PDFs aguardando decisão administrativa
├── .locks/              locks por ficha
└── .submission-locks/   locks por submissão
```

As escritas de JSON são feitas de forma atômica, utilizando arquivo temporário e renomeação. Locks por ficha impedem que dois processos alterem a mesma ficha simultaneamente.

`submissions`, `quarantine` e os locks são dados operacionais e não fazem parte do acervo versionado no Git.

## Revisões

Quando uma ficha já existe, uma nova importação gera uma revisão contendo:

- ficha atual;
- nova versão extraída;
- diferenças encontradas;
- metadados da importação.

A revisão pode ser aplicada ou descartada. O sistema impede a sobrescrita de uma revisão ainda pendente e bloqueia a aplicação de uma revisão que ficou obsoleta em relação à ficha oficial.

## Integração com Discord

O bot é um processo separado dentro do mesmo projeto e utiliza `discord.js`.

O comando `/enviar-ficha` recebe o PDF no canal configurado e cria uma submissão. Nesse momento, o arquivo ainda não é enviado ao parser.

```text
/enviar-ficha
      ↓
Validação inicial
      ↓
SubmissionService
      ↓
Quarentena
      ↓
Mensagem no canal administrativo
      ↓
[ Importar ficha ]  [ Descartar ]
```

O módulo é dividido em comandos, componentes, configuração, autorização, segurança e gerenciamento das submissões.

```text
discord/
├── commands/       slash commands
├── components/     botões e mensagens
├── security/       comunicação com ClamAV
├── submissions/    fila, quarentena e decisões
├── authorization.ts
├── config.ts
└── bot.ts
```

Somente usuários configurados como administradores podem importar ou descartar uma submissão.

## Quarentena e ClamAV

Arquivos recebidos pelo Discord são armazenados temporariamente em `data/quarantine` com identificadores internos.

Antes de uma importação administrativa, o bot envia o conteúdo ao `clamd` através do protocolo `INSTREAM`.

```text
Quarentena
    ↓
  ClamAV
  ↙    ↘
limpo   ameaça/erro
  ↓         ↓
Parser    bloqueio
```

Somente uma resposta limpa permite que o arquivo seja entregue ao `ImportFichaService`. Arquivos importados, descartados, bloqueados ou expirados são removidos da quarentena.

Submissões pendentes iguais são identificadas por SHA-256, e locks por submissão impedem decisões concorrentes sobre o mesmo arquivo.

## Git

A integração Git é executada pelo backend através do Git CLI e utiliza um **repositório de sincronização isolado** em `runtime/git-sync`. Esse repositório é independente do `.git` usado no desenvolvimento do código.

A autenticação com o GitHub utiliza SSH. A chave privada é lida de `.secrets/github_deploy_key`, diretório ignorado pelo Git e montado como somente leitura no container. A chave não é armazenada na interface nem na configuração persistida.

A configuração persistida em `runtime/git-settings.json` contém apenas dados não secretos: URL SSH do repositório, branch, grupos sincronizados, autor e padrões de mensagens de commit.

Os grupos disponíveis para sincronização são:

```text
data/fichas
data/revisoes
```

O Push copia somente os grupos selecionados para o repositório de sincronização, compara as alterações, gera a mensagem de commit e exige uma prévia antes do envio. O Pull verifica primeiro se existem mudanças locais ainda não sincronizadas e, nesse caso, é bloqueado para evitar sobrescrita automática do acervo.

## Execução

A aplicação principal é executada em Docker com `data`, `runtime` e `.secrets` montados separadamente. O frontend compilado é servido pelo Express em `localhost:3333`.

O ClamAV é executado como um serviço separado no Docker Compose.

O bot do Discord é executado como um processo Node.js separado e acessa os mesmos dados locais da aplicação.

```text
Máquina local
│
├── Docker
│   ├── Arquivo Tormenta
│   │   └── React + Express
│   └── ClamAV
│
├── Bot Discord
│
├── data/
│   ├── fichas
│   ├── revisoes
│   ├── submissions
│   └── quarantine
├── runtime/
│   ├── git-settings.json
│   └── git-sync/
└── .secrets/
    └── github_deploy_key
```

## Tipos compartilhados

Os contratos utilizados por frontend e backend ficam em `shared/types.ts`. Isso evita manter representações diferentes da mesma ficha, revisão ou resposta de API em pontos distintos do projeto.
