# Changelog

## 1.2.0

- Bot do Discord para envio de fichas pelo comando `/enviar-ficha`.
- Fila de submissões com quarentena antes da ficha chegar ao parser.
- Canal separado para envio de fichas e canal privado para avaliação administrativa.
- Botões administrativos para importar ou descartar sem download manual.
- Verificação obrigatória de ameaças com ClamAV antes da importação.
- Bloqueio da importação quando uma ameaça é detectada ou a verificação de segurança não pode ser concluída.
- Remoção automática dos PDFs após importação, descarte, bloqueio ou expiração.
- Detecção de arquivos duplicados enquanto uma submissão igual ainda está pendente.
- Registro da origem, arquivo, horário e remetente das importações realizadas pelo Discord.
- Serviço de importação compartilhado entre a interface web e o Discord.

## 1.1.0

- Frontend separado em páginas, componentes, hooks, roteamento, configurações e cliente de API.
- Tipos compartilhados entre frontend e backend.
- Navegação funcional para todas as áreas laterais.
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
