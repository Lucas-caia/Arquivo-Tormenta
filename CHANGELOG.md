# Changelog

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
