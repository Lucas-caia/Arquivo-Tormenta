# Arquitetura do Arquivo Tormenta RPG

## Visão geral

O Arquivo Tormenta RPG utiliza uma arquitetura de **monólito modular**. Frontend, API, regras de importação, persistência, integração com Git e integração com Discord pertencem ao mesmo projeto, mas são separados por responsabilidade.

A aplicação possui duas entradas para fichas:

- **Interface web local**, usada para consultar, importar, revisar e administrar o acervo.
- **Bot do Discord**, usado para receber PDFs externos e encaminhá-los para uma fila administrativa antes da importação. O canal de submissões também funciona como uma caixa de entrada persistente para PDFs enviados enquanto o processo do bot estiver off-line.

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
                         │ ImportFichaService   │◄─────────────────────────────┐
                         └──────────┬───────────┘                              │
                                    │                                          │
                      ┌─────────────┼─────────────┐                            │
                      ▼             ▼             ▼                            │
                   Parser          Diff        Storage                         │
                   PDF→JSON                     JSON                           │
                                                    ▲                           │
                                                    │                           │
Discord ─► Canal ─► Bot / Sync ─► SubmissionService ─► Quarentena ─► ClamAV ──┘
```

## Frontend

O frontend é uma **SPA em React + TypeScript**, construída com Vite.

A interface é organizada em páginas e componentes reutilizáveis. A navegação utiliza rotas por hash e possui as áreas:

- Dashboard;
- Fichas;
- Mesa;
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

## Sistema de Mesas

A **Mesa** é uma área de consulta temporária voltada ao uso durante sessões de RPG. Ela permite selecionar fichas já existentes no acervo e mantê-las reunidas em uma única tela para acesso rápido, sem criar uma campanha persistente ou uma segunda cópia dos personagens.

```text
Acervo
  │
  ├── Ficha A ──┐
  ├── Ficha B ──┼──► Mesa temporária
  └── Ficha C ──┘          │
                           ├── PV / PM / Defesa / Deslocamento
                           ├── Atributos e testes principais
                           ├── Ataques
                           ├── Informações complementares
                           └── Ficha completa
```

Todas as fichas permanecem disponíveis para busca e inclusão. Nos cards da Mesa, as informações de consulta mais frequente aparecem primeiro, como vida, mana, Defesa e deslocamento. Atributos, testes principais e ataques ficam logo abaixo, enquanto informações menos recorrentes podem ser expandidas quando necessárias. A ficha completa continua acessível pelo mesmo fluxo de visualização usado no acervo.

A Mesa não possui endpoint, arquivo, banco de dados ou persistência própria. O estado é mantido pelo hook `useMesa` acima da renderização das páginas, permitindo navegar para Dashboard, GitHub, Configurações ou outras áreas e retornar à Mesa sem perder a seleção atual.

```text
App
├── useMesa()  ← estado temporário em memória
│
├── Dashboard
├── Fichas
├── GitHub
├── Configurações
└── MesaPage
```

A seleção é descartada quando a SPA é recarregada ou fechada. Não é utilizado `localStorage`, cache persistente ou armazenamento no backend. A Mesa também não altera as fichas do acervo: sua responsabilidade é somente organizar e apresentar informações para consulta rápida.

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
├── submissions/         metadados da fila do Discord e checkpoint da caixa de entrada
├── quarantine/          PDFs aguardando decisão administrativa
├── .locks/              locks por ficha
└── .submission-locks/   locks por submissão
```

As escritas de JSON são feitas de forma atômica, utilizando arquivo temporário e renomeação. Locks por ficha impedem que dois processos alterem a mesma ficha simultaneamente.

`submissions`, `quarantine` e os locks são dados operacionais e não fazem parte do acervo versionado no Git. O checkpoint da sincronização do canal fica em `data/submissions/.inbox-state.json` e também permanece somente no armazenamento local.

A Mesa não aparece nessa estrutura porque não possui persistência: sua seleção existe apenas em memória no frontend durante a sessão atual da aplicação.

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

Além do comando, o canal configurado em `DISCORD_SUBMISSION_CHANNEL_ID` funciona como uma **caixa de entrada persistente**. O usuário pode anexar um PDF diretamente ao canal mesmo quando o processo local estiver desligado. O Discord mantém a mensagem e o anexo; quando o bot volta a ficar disponível, a sincronização recupera as mensagens ainda não processadas e encaminha cada ficha para o mesmo `SubmissionService` usado pelo fluxo normal.

```text
BOT OFF-LINE

Usuário ─► Canal de submissões ─► mensagem + PDF permanecem no Discord

BOT ON-LINE

Canal de submissões
        ↓
   ChannelInbox
        ↓
SubmissionService
        ↓
   Quarentena
        ↓
Canal administrativo
        ↓
[ Importar ficha ]  [ Descartar ]
```

A sincronização acontece em três situações: na inicialização do bot, quando uma nova mensagem chega ao canal e por uma reconciliação periódica a cada 15 minutos. Essas execuções são serializadas para evitar duas varreduras concorrentes sobre o mesmo histórico.

O progresso é salvo em `data/submissions/.inbox-state.json` através do ID da última mensagem processada. Cada submissão criada por esse fluxo também registra `sourceMessageId` e `sourceAttachmentId`, permitindo reconhecer uma ficha já registrada caso o processo seja interrompido antes de concluir toda a sincronização.

Na primeira sincronização, o bot não percorre indefinidamente todo o histórico do canal: são consideradas mensagens dentro do período definido por `DISCORD_SUBMISSION_TTL_DAYS`, cujo valor padrão é 14 dias. O fluxo aceita um PDF por mensagem para que cada ficha mantenha um protocolo próprio.

Se a sincronização do histórico estiver temporariamente indisponível, a falha é isolada. O bot continua conectado e os slash commands e botões administrativos permanecem disponíveis; uma nova tentativa pode ocorrer na próxima reconciliação.

Para ler mensagens comuns e seus anexos, o bot utiliza os intents `GuildMessages` e `MessageContent`. Por isso, **Message Content Intent** deve estar habilitado no Discord Developer Portal. No canal de submissões também são necessárias as permissões **View Channel**, **Read Message History** e **Send Messages**.

O módulo é dividido em comandos, componentes, configuração, autorização, segurança e gerenciamento das submissões.

```text
discord/
├── commands/                 slash commands
├── components/               botões e mensagens
├── security/                 comunicação com ClamAV
├── submissions/
│   ├── channelInbox.ts       sincronização e recuperação do canal
│   ├── inboxState.ts         checkpoint local da sincronização
│   ├── reviewChannel.ts      envio compartilhado ao canal administrativo
│   └── ...                   fila, quarentena e decisões
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

A sincronização considera somente os grupos selecionados. Alterações remotas em código, documentação ou outros arquivos fora desses escopos podem avançar a referência interna de `runtime/git-sync`, mas não bloqueiam um Push ou Pull das fichas.

### Push

Antes de preparar a prévia, o backend atualiza a referência remota, copia os grupos locais selecionados para `runtime/git-sync` e prepara explicitamente adições, alterações e remoções do acervo. A prévia é construída a partir do conteúdo realmente preparado pelo Git.

```text
Acervo local
     ↓
cópia para runtime/git-sync
     ↓
preparação dos escopos selecionados
     ↓
prévia dos arquivos + mensagem de commit
     ↓
confirmação do usuário
     ↓
commit + push
```

A prévia possui um fingerprint relacionado à base remota e ao conteúdo preparado. Se uma ficha mudar depois que a prévia foi criada, a confirmação é recusada e uma nova prévia precisa ser preparada.

Quando a branch remota avançou apenas por alterações fora do acervo, a nova base é incorporada automaticamente. Se o remoto alterou fichas ou revisões, o sistema compara os caminhos envolvidos antes de permitir o Push.

### Pull seguro

O Pull diferencia mudanças locais e remotas por arquivo. Alterações locais não são descartadas apenas porque existem mudanças novas no GitHub.

```text
Local:  Ficha A alterada
Remoto: Ficha B alterada
        ↓
Pull seguro
        ↓
Ficha B é incorporada
Ficha A local é preservada
```

Quando o mesmo arquivo foi modificado dos dois lados, a operação é bloqueada para impedir que uma versão sobrescreva silenciosamente a outra.

```text
Local:  Ficha A alterada
Remoto: Ficha A alterada
        ↓
conflito real
        ↓
Pull/Push bloqueado
```

Se o conteúdo local já corresponder ao estado remoto, a referência operacional é simplesmente reconciliada. Dessa forma, o Git do projeto e o Git do acervo permanecem relacionados pelo mesmo repositório remoto, mas mudanças de código não são tratadas como conflitos de dados.

## Execução

A aplicação principal é executada em Docker com `data`, `runtime` e `.secrets` montados separadamente. O frontend compilado é servido pelo Express em `localhost:3333`.

O ClamAV é executado como um serviço separado no Docker Compose.

O bot do Discord é executado como um processo Node.js separado e acessa os mesmos dados locais da aplicação. Quando esse processo é iniciado novamente, ele também reconcilia o canal de submissões para recuperar PDFs enviados durante o período off-line.

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
