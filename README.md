# Arquivo Tormenta RPG

O **Arquivo Tormenta RPG** organiza fichas de personagens a partir de PDFs preenchíveis, mantendo os dados em JSON e protegendo cada atualização com um fluxo de revisão.

O objetivo é simples: oferecer um lugar rápido, confiável e fácil de manter para armazenar fichas, acompanhar pendências e consultar alterações anteriores.

## Como funciona

1. Uma ficha em PDF é enviada pela interface.
2. O sistema valida o arquivo e extrai seus campos.
3. Fichas novas são adicionadas ao acervo como pendentes de aprovação.
4. Quando uma ficha já existe, uma revisão é criada com as diferenças encontradas.
5. A versão oficial só é alterada depois que a revisão é aprovada.
6. Os arquivos podem ser sincronizados com o repositório por Git.

O PDF é processado em memória e descartado. Apenas os dados extraídos são armazenados.

## Principais recursos

- Importação de fichas por PDF.
- Busca e filtros no acervo.
- Visualização completa dos dados extraídos.
- Comparação entre a ficha atual e uma nova versão.
- Aprovação ou descarte de revisões pendentes.
- Aprovação individual ou em massa de fichas novas.
- Exportação consolidada em JSON.
- Integração com Git para pull, status e push.
- Tema claro, escuro ou automático.
- Texto ampliado, alto contraste e redução de movimento.

## Uso privado

O projeto foi pensado para uso pessoal ou por um pequeno grupo de pessoas de confiança. Por isso, a versão atual não possui login, cadastro, sessões ou perfis de usuário.

O acesso é controlado pelo ambiente onde a aplicação está instalada. Já a permissão para enviar alterações ao repositório depende das credenciais configuradas no Git.

Essa decisão pode ser revista no futuro, mas autenticação não faz parte do escopo atual.

## Arquitetura

O projeto utiliza um **monólito modular full stack**:

```text
React
  │
  ▼
API Express
  ├── fichas
  ├── revisões
  ├── importação
  ├── Git
  └── armazenamento
          │
          ▼
      arquivos JSON
```

Os tipos compartilhados entre frontend e backend ficam em `shared/types.ts`. A organização técnica mais detalhada está em [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Estrutura do projeto

```text
shared/          Tipos usados pelo frontend e backend
src/             Interface React
server/          API, parser, validações e armazenamento
data/fichas/     Fichas oficiais
data/revisoes/   Atualizações pendentes
docs/            Documentação técnica
```

## Executando com Docker

```bash
docker compose up --build
```

A aplicação ficará disponível em:

```text
http://localhost:3333
```

Por padrão, o Docker Compose publica a aplicação apenas no computador local.

## Executando localmente

Requer Node.js 22.

```bash
npm install
npm run dev
```

Durante o desenvolvimento:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:3333
```

## Verificações do projeto

```bash
npm run typecheck
npm test
npm run check
npm run build
```

Antes de enviar alterações, execute pelo menos `npm run check` e confirme que a importação de uma ficha de referência continua funcionando.

## Cuidados com as fichas

A importação é a parte principal do projeto. Alterações no parser devem preservar os nomes e o comportamento dos campos já suportados.

O sistema rejeita arquivos vazios, muito grandes, corrompidos, protegidos ou sem campos preenchíveis. Também impede que uma revisão pendente seja substituída silenciosamente e bloqueia a aplicação de revisões desatualizadas.

Quando um arquivo não puder ser processado, a ficha oficial permanece inalterada.

## Armazenamento e histórico

As fichas atuais são armazenadas em:

```text
data/fichas/<id>.json
```

As atualizações que aguardam decisão ficam em:

```text
data/revisoes/<id>.json
```

No estágio atual, o Git complementa o histórico e a sincronização dos dados. A evolução planejada é manter versões imutáveis dentro da própria aplicação, permitindo consultar e restaurar alterações sem depender diretamente do histórico do repositório.

## Estado atual e próximos passos

A base atual atende bem a um acervo pequeno e privado. Para acompanhar o crescimento futuro, as próximas evoluções mais importantes são:

- histórico completo de versões e decisões;
- identificadores estáveis para as fichas;
- paginação e busca no servidor;
- migração gradual do armazenamento operacional para SQLite;
- testes de integração e importação;
- medições com acervos de 1.000, 5.000 e 10.000 fichas.

A prioridade do projeto continuará sendo a mesma: **armazenar fichas com velocidade, segurança e clareza**.
