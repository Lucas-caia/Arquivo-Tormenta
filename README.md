# Arquivo Tormenta RPG
 
O **Arquivo Tormenta RPG** organiza fichas de personagens a partir de PDFs preenchíveis, mantendo os dados em JSON e protegendo cada atualização com um fluxo de revisão.
 
A prioridade do projeto é armazenar fichas com rapidez, segurança e clareza, mantendo pendências e alterações fáceis de acompanhar.
 
## Como funciona
 
1. Uma ficha pode ser enviada pela interface local ou pelo bot do Discord.
2. No Discord, o PDF pode ser enviado pelo comando `/enviar-ficha` enquanto o bot estiver on-line ou anexado diretamente no canal de submissões.
3. Se o PDF for enviado diretamente ao canal enquanto o bot estiver off-line, a mensagem e o anexo permanecem armazenados no Discord até a próxima sincronização.
4. Ao iniciar, ao receber uma nova mensagem ou durante a reconciliação periódica, o bot procura mensagens ainda não processadas, coloca o PDF em quarentena local e gera um protocolo.
5. Um administrador recebe a submissão em um canal privado e escolhe **Importar** ou **Descartar**.
6. Antes da importação, o ClamAV verifica o arquivo. Arquivos suspeitos são bloqueados e removidos.
7. Somente PDFs aprovados pelo antivírus chegam ao mesmo serviço de importação usado pela interface web.
8. Fichas novas entram como pendentes; atualizações criam uma revisão com as diferenças encontradas.
9. Durante uma sessão, fichas do acervo podem ser reunidas temporariamente na **Mesa** para consulta rápida, sem alterar os dados originais.
 
Depois do processamento, o PDF é removido. O acervo continua armazenando apenas os dados extraídos.
 
A Mesa existe somente durante a sessão atual da aplicação. Ela permanece disponível ao navegar entre as áreas do sistema, mas é descartada ao recarregar ou fechar a aplicação.
 
## Principais recursos
 
- Importação de fichas por PDF.
- Fila de submissões pelo Discord com quarentena e aprovação administrativa.
- Recebimento assíncrono de PDFs pelo canal do Discord, com recuperação das mensagens enviadas enquanto o bot estava off-line.
- Verificação de arquivos com ClamAV antes do parser.
- Busca e filtros no acervo.
- Mesa temporária para consulta rápida de múltiplas fichas durante sessões de RPG.
- Comparação e descarte de revisões pendentes.
- Aprovação de fichas novas.
- Exportação consolidada em JSON.
- Sincronização GitHub por SSH, com branch, escopo e mensagens de commit configuráveis.
- Configurações de acessibilidade.
 
## Uso privado
 
O painel foi pensado para uso pessoal ou por um pequeno grupo de administradores de confiança. Não existem login, cadastro ou perfis internos.
 
Usuários externos podem enviar fichas pelo Discord sem obter acesso ao painel ou ao repositório. Apenas IDs definidos em `DISCORD_ADMIN_USER_IDS` podem aprovar ou descartar uma submissão.
 
## Arquitetura
 
O projeto utiliza um **monólito modular full stack**. A entrada pelo Discord usa uma fila própria, mas a importação aprovada termina no mesmo serviço usado pelo navegador. O canal de submissões também funciona como uma caixa de entrada persistente: mensagens enviadas durante períodos off-line são sincronizadas quando o bot volta a ficar disponível.
 
```text
Web ────────────────────────────────────────────────────────────┐
                                                                ▼
                                                         ImportFichaService ──► Parser ──► Revisões / Fichas
                                                                ▲
Discord ─► Canal de submissões ─► Bot / Sincronização ─► Quarentena ─► ClamAV ──┘
                                      │
                                      └──► Aprovação dos administradores
```
 
A Mesa é uma funcionalidade exclusivamente de frontend: ela reutiliza as fichas carregadas do acervo e mantém sua seleção apenas em memória enquanto a SPA permanece aberta.
 
A organização detalhada está em [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
 
## Executando
 
Requer Node.js 22 e Docker para o modo recomendado com ClamAV.
 
```bash
npm install
```
 
Crie `.env` a partir de `.env.example` e preencha os IDs e o token do Discord.

Para permitir a sincronização de PDFs enviados como mensagens comuns, habilite **Message Content Intent** no Discord Developer Portal. No canal de submissões, o bot também precisa das permissões **View Channel**, **Read Message History** e **Send Messages**. O comando `/enviar-ficha` continua disponível normalmente enquanto o bot estiver on-line.
 
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

A sincronização usa um repositório interno em `runtime/git-sync`, separado do `.git` utilizado para desenvolver o projeto. Somente os grupos selecionados do acervo participam da comparação, portanto commits de código, documentação ou outros arquivos do repositório não bloqueiam a sincronização das fichas.

O **Pull seguro** preserva alterações locais quando as mudanças remotas estão em arquivos diferentes. A operação só é bloqueada quando o mesmo arquivo do acervo foi alterado localmente e remotamente, evitando sobrescritas automáticas.

## Verificações

```bash
npm run typecheck
npm test
npm run check
npm run build
```

Antes de alterar o parser, confirme também que uma ficha de referência continua sendo importada corretamente.
