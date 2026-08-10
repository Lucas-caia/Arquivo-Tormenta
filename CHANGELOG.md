# Changelog

## 1.3.0

- Fila de submissões do Discord com quarentena antes do parser.
- Canal separado para envio público/controlado e revisão privada dos administradores.
- Botões administrativos para importar ou descartar sem download manual.
- Verificação obrigatória com ClamAV/clamd antes da importação.
- Bloqueio seguro quando o antivírus está indisponível ou detecta ameaça.
- Remoção automática do PDF após importação, descarte, bloqueio ou expiração.
- Detecção de submissões pendentes duplicadas por SHA-256.
- Lock por submissão para impedir decisões concorrentes.
- Expiração configurável dos arquivos em quarentena.
- Serviço ClamAV no Docker Compose com porta publicada apenas em localhost.

## 1.2.0

- Bot do Discord para envio de fichas pelo comando `/enviar-ficha`.
- Autorização do bot por servidor, canal e lista de usuários permitidos.
- Serviço de importação compartilhado entre a interface web e o Discord.
- Registro da origem, arquivo, horário e remetente das importações.
- Proteção por lock para importações concorrentes da mesma ficha.
- Discord mantido fora do container principal para preservar uma imagem menor e o funcionamento local.

## 1.1.0

- Frontend separado em páginas, componentes, hooks, roteamento, configurações e cliente de API.
- Tipos compartilhados entre frontend e backend.
- Navegação funcional para todas as áreas laterais.
- Remoção do perfil fictício fixo da barra lateral.
- Configurações de aparência, texto, contraste e movimento.
- Melhorias de acessibilidade em navegação, ações, mensagens e modais.
- Backend separado em aplicação, rotas, middlewares, validações e erros.
- Validação de PDF no navegador e no servidor.
- Respostas HTTP específicas para falhas de importação.
- Escrita atômica dos arquivos JSON.
- Proteção de IDs usados em caminhos.
- Bloqueio de sobrescrita de revisão pendente.
- Ação explícita para descartar uma revisão sem alterar a ficha oficial.
- Proteção contra aplicação de revisão obsoleta.
- Correção do escopo de arquivos preparados pelo push.
- Git instalado na imagem Docker e porta vinculada apenas ao localhost.
- Testes de parser, diff e validação de identificadores.
- Exportação consolidada sem uma segunda leitura completa dos arquivos.
- Atalho de acessibilidade compatível com a navegação por hash.
