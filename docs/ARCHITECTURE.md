# Arquitetura do Arquivo Tormenta RPG

## Direção

O projeto adota um monólito modular. A prioridade é manter importação, revisão, histórico e armazenamento simples, rápidos e confiáveis sem introduzir distribuição desnecessária.

## Entradas do sistema

A interface web continua sendo uma entrada administrativa direta. O Discord funciona como uma caixa de entrada para pessoas externas:

```text
Interface web ────────────────────────────┐
                                         ▼
                                  ImportFichaService
                                         ▲
Discord ─► SubmissionService ─► ClamAV ──┘
              │
              └─► Quarentena + aprovação administrativa
```

O PDF enviado pelo Discord não é entregue ao parser durante a submissão. Ele é salvo com nome interno em `data/quarantine`, enquanto os metadados operacionais ficam em `data/submissions`.

Somente depois de um administrador clicar em **Importar ficha** o arquivo é enviado ao `clamd` por `INSTREAM`. Uma resposta limpa permite chamar o `ImportFichaService`; uma detecção bloqueia a importação e remove o arquivo da quarentena.

## Módulo Discord

- `bot.ts`: ciclo de vida do cliente, comandos, botões e limpeza periódica.
- `config.ts`: servidor, canais, administradores, TTL e conexão com ClamAV.
- `authorization.ts`: separa permissão de submissão e permissão administrativa.
- `downloadAttachment.ts`: download limitado e temporário do anexo.
- `commands/enviarFicha.ts`: recebe o PDF e cria a submissão.
- `components/`: mensagens e ações dos botões administrativos.
- `submissions/`: modelo, armazenamento, quarentena, expiração e casos de uso.
- `security/`: cliente mínimo do protocolo `clamd` e verificação de disponibilidade.

## Segurança da submissão

O fluxo do Discord segue estas regras:

1. somente o canal de submissão aceita `/enviar-ficha`;
2. qualquer pessoa com acesso a esse canal pode submeter, sem acesso ao painel;
3. nome, MIME, tamanho e assinatura PDF são validados antes de aceitar a submissão;
4. o arquivo recebe um nome interno e nunca é servido pela aplicação;
5. submissões duplicadas ainda pendentes são detectadas por SHA-256;
6. somente IDs em `DISCORD_ADMIN_USER_IDS` podem importar ou descartar;
7. o ClamAV é obrigatório para importar; indisponibilidade bloqueia a ação;
8. arquivos detectados são removidos sem chegar ao parser;
9. arquivos importados ou descartados também são removidos da quarentena;
10. submissões antigas expiram e têm o arquivo removido automaticamente.

Os diretórios de quarentena e metadados de submissão são operacionais e ficam fora do Git.

## ClamAV

O projeto usa `clamd`, executado pelo Docker Compose. O bot se conecta à porta TCP publicada somente em `127.0.0.1:3310` e envia o conteúdo pelo comando `INSTREAM`; não compartilha caminhos de arquivos com o container.

O cliente usa apenas módulos nativos do Node.js e não adiciona uma biblioteca de antivírus ao código da aplicação.

A verificação ocorre somente no fluxo de aprovação das submissões do Discord. Uploads administrativos feitos diretamente pela interface local continuam no fluxo atual.

## Integridade entre processos

API e bot podem acessar `data` simultaneamente. O armazenamento de fichas continua protegido por lock por ficha e escritas atômicas.

Submissões possuem um lock separado por ID. Isso impede que dois administradores cliquem em **Importar** e **Descartar** ao mesmo tempo ou que a mesma submissão seja processada duas vezes.

## Persistência operacional

```text
data/
├── fichas/          acervo oficial
├── revisoes/        revisões pendentes
├── submissions/     metadados locais da fila do Discord
├── quarantine/      PDFs aguardando decisão, com nomes internos
├── .locks/          locks das fichas
└── .submission-locks/ locks das submissões
```

`submissions` e `quarantine` não são adicionados ao Git. A meta continua sendo migrar o armazenamento operacional para SQLite quando isso trouxer benefício mensurável.

## Desempenho

O ClamAV é um daemon persistente e não participa de consultas, dashboard, busca ou listagem de fichas. O custo de scan existe apenas quando um administrador aprova uma submissão.

Para a meta futura de 5.000 a 10.000 fichas, os próximos marcos continuam sendo paginação e busca no servidor, benchmarks e uma eventual migração para SQLite baseada em medição.
