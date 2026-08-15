# Arquivo Tormenta RPG

O **Arquivo Tormenta RPG** organiza fichas de personagens a partir de PDFs preenchíveis, mantendo os dados em JSON e protegendo cada atualização com um fluxo de revisão.

A prioridade do projeto é armazenar fichas com rapidez, segurança e clareza, mantendo pendências e alterações fáceis de acompanhar.
## Como funciona
1. Uma ficha pode ser enviada pela interface local ou pelo canal de submissões do Discord.
2. No Discord, o usuário pode anexar o PDF diretamente no canal. A mensagem permanece no Discord mesmo se o bot estiver off-line.
3. Ao iniciar, receber uma nova mensagem ou executar a reconciliação periódica, o bot sincroniza as mensagens ainda não processadas, baixa o PDF para a quarentena local e gera um protocolo.
4. Um administrador recebe a submissão em um canal privado e escolhe **Importar** ou **Descartar**.
5. Antes da importação, o ClamAV verifica o arquivo. Arquivos suspeitos são bloqueados e removidos.
6. Somente PDFs aprovados pelo antivírus chegam ao mesmo serviço de importação usado pela interface web.
7. Fichas novas entram como pendentes; atualizações criam uma revisão com as diferenças encontradas.
Depois do processamento, o PDF é removido. O acervo continua armazenando apenas os dados extraídos.
## Principais recursos

- Importação de fichas por PDF.
- Caixa de entrada assíncrona pelo Discord, com sincronização após períodos off-line, quarentena e aprovação administrativa.
- Verificação de arquivos com ClamAV antes do parser.
- Busca e filtros no acervo.
- Comparação e descarte de revisões pendentes.
- Aprovação de fichas novas.
- Exportação consolidada em JSON.
- Integração com Git para pull, status e push.
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
Discord ─► Caixa de entrada ─► Bot/sincronização ─► Quarentena ─► ClamAV ──┘
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

No Discord Developer Portal, habilite **Message Content Intent** para o bot. No canal de submissões, o bot precisa de **View Channel**, **Read Message History** e **Send Messages** para sincronizar anexos enviados enquanto estava off-line. O comando `/enviar-ficha` continua disponível quando o bot está on-line.

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
## Verificações

```bash
npm run typecheck
npm test
npm run check
npm run build
```

Antes de alterar o parser, confirme também que uma ficha de referência continua sendo importada corretamente.
