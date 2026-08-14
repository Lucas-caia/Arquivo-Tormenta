# Arquivo Tormenta RPG

O **Arquivo Tormenta RPG** organiza fichas de personagens a partir de PDFs preenchíveis, mantendo os dados em JSON e protegendo cada atualização com um fluxo de revisão.

A prioridade do projeto é armazenar fichas com rapidez, segurança e clareza, mantendo pendências e alterações fáceis de acompanhar.

## Como funciona

1. Uma ficha pode ser enviada pela interface local ou pelo bot do Discord.
2. No Discord, o PDF entra primeiro em uma quarentena local e o usuário recebe um protocolo.
3. Um administrador recebe a submissão em um canal privado e escolhe **Importar** ou **Descartar**.
4. Antes da importação, o ClamAV verifica o arquivo. Arquivos suspeitos são bloqueados e removidos.
5. Somente PDFs aprovados pelo antivírus chegam ao mesmo serviço de importação usado pela interface web.
6. Fichas novas entram como pendentes; atualizações criam uma revisão com as diferenças encontradas.

Depois do processamento, o PDF é removido. O acervo continua armazenando apenas os dados extraídos.

## Principais recursos

- Importação de fichas por PDF.
- Fila de submissões pelo Discord com quarentena e aprovação administrativa.
- Verificação de arquivos com ClamAV antes do parser.
- Busca e filtros no acervo.
- Comparação e descarte de revisões pendentes.
- Aprovação de fichas novas.
- Exportação consolidada em JSON.
- Sincronização GitHub por SSH, com branch, escopo e mensagens de commit configuráveis.
- Configurações de acessibilidade.

## Uso privado

O painel foi pensado para uso pessoal ou por um pequeno grupo de administradores de confiança. Não existem login, cadastro ou perfis internos.

Usuários externos podem enviar fichas pelo Discord sem obter acesso ao painel ou ao repositório. Apenas IDs definidos em `DISCORD_ADMIN_USER_IDS` podem aprovar ou descartar uma submissão.

## Arquitetura

O projeto utiliza um **monólito modular full stack**. A entrada pelo Discord usa uma fila própria, mas a importação aprovada termina no mesmo serviço usado pelo navegador.

```text
Web ───────────────────────────────┐
                                   ▼
                            ImportFichaService ──► Parser ──► Revisões / Fichas
                                   ▲
Discord ─► Quarentena ─► ClamAV ──┘
             │
             └──► Aprovação dos administradores
```

A organização detalhada está em [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Executando

Requer Node.js 22 e Docker para o modo recomendado com ClamAV.

```bash
npm install
```

Crie `.env` a partir de `.env.example` e preencha os IDs e o token do Discord.

Inicie a aplicação e o ClamAV:

```bash
docker compose up --build
```

Em outro terminal, confirme o antivírus e inicie o bot:

```bash
npm run clamav:check
npm run bot
```

A aplicação fica em `http://localhost:3333`.

Para desenvolvimento do frontend/backend fora do Docker:

```bash
npm run dev
```

Nesse modo, a interface do Vite fica em `http://localhost:5173`. O ClamAV pode continuar sendo executado pelo Docker Compose.

## Sincronização com GitHub

A aplicação usa uma **Deploy Key SSH exclusiva do repositório**. A chave privada fica somente em `.secrets/github_deploy_key`, fora do Git e fora da imagem Docker.

Na área **GitHub** da interface é possível configurar a URL SSH do repositório, a branch, quais grupos de dados entram na sincronização e o padrão das mensagens de commit. O Push sempre apresenta uma prévia antes da confirmação.

A sincronização usa um repositório interno em `runtime/git-sync`, separado do `.git` utilizado para desenvolver o projeto.

## Verificações

```bash
npm run typecheck
npm test
npm run check
npm run build
```

Antes de alterar o parser, confirme também que uma ficha de referência continua sendo importada corretamente.
