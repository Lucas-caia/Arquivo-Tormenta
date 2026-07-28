# Arquitetura do Arquivo Tormenta RPG

## Direção

O projeto adota um monólito modular porque o domínio ainda é pequeno, o número de operadores é baixo e o objetivo principal é manter a importação e o armazenamento de fichas simples e confiáveis.

Microsserviços não oferecem benefício neste estágio. Eles aumentariam custo operacional, pontos de falha e complexidade de consistência sem resolver um problema real do produto.

## Módulos do frontend

- `api`: comunicação HTTP e normalização de erros.
- `components`: elementos reutilizáveis e componentes de domínio.
- `hooks`: coordenação do estado e das operações da aplicação.
- `pages`: composição de cada área navegável.
- `routing`: navegação por hash sem dependência externa.
- `settings`: persistência e aplicação das opções de acessibilidade.
- `utils`: funções puras de formatação e validação local.

`App.tsx` atua apenas como raiz de composição e seleção da página atual.

## Módulos do backend

- `routes`: contratos HTTP agrupados por recurso.
- `middleware`: upload, tratamento assíncrono e erros.
- `parser`: adaptação do PDF para o modelo de domínio.
- `storage`: leitura, escrita e regras de integridade dos arquivos.
- `git`: integração com o processo Git.
- `validation`: validações de borda e proteção de caminhos.
- `errors`: erros de aplicação com status e código estáveis.

## Contratos compartilhados

`shared/types.ts` é a fonte única dos contratos usados pelas duas aplicações. Mudanças incompatíveis devem ser feitas conscientemente e acompanhadas por testes.

## Regras de dependência

- páginas podem depender de componentes, hooks e contratos;
- componentes não devem chamar a API diretamente;
- o hook de aplicação coordena casos de uso do frontend;
- rotas não devem conhecer detalhes do sistema de arquivos;
- o parser não deve salvar dados;
- a persistência não deve interpretar PDFs;
- erros de domínio devem usar `AppError` em vez de strings soltas.

## Desempenho

A rota de listagem lê o conjunto de fichas uma única vez e calcula as estatísticas em memória, eliminando a duplicação de I/O da versão anterior.

Para a meta futura de 5.000 a 10.000 fichas, os próximos marcos devem ser orientados por medição:

1. benchmark da listagem atual;
2. paginação e busca no servidor;
3. cache de metadados ou índice persistente;
4. migração para SQLite quando a leitura de milhares de arquivos se tornar o gargalo dominante.

A migração para SQLite deve preservar a exportação em JSON e não exige separar o sistema em serviços.

## Integridade

A escrita atômica reduz o risco de JSON parcial. O bloqueio de revisão pendente evita perda silenciosa. O controle de versão na aplicação de revisões evita aplicar uma comparação obsoleta.

Ainda falta controle explícito de concorrência entre processos. Se mais de uma instância do servidor for permitida, a persistência por arquivos deverá ser substituída por uma base transacional antes disso.

## Evolução do histórico

O modelo futuro recomendado possui entidades separadas:

```text
Ficha
VersaoDaFicha
Revisao
DecisaoDaRevisao
```

Cada versão deve ser imutável. A ficha aponta para a versão atual, e a revisão registra a versão de origem e a versão proposta. O Git permanece como backup ou sincronização, não como única fonte do histórico de domínio.
