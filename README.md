# Arquivo Tormenta RPG

Sistema local para importar fichas de personagens de Tormenta em PDF, extrair os campos relevantes, salvar cada personagem como JSON e controlar revisões antes de atualizar uma ficha existente.

## O que o projeto faz

- Recebe uma ficha PDF pelo navegador.
- Lê os campos preenchidos do modelo de ficha enviado.
- Usa o nome do personagem como identificador principal.
- Salva somente o JSON da ficha em `data/fichas`.
- Não salva o PDF bruto em nenhuma pasta do projeto.
- Detecta quando uma ficha já existe.
- Compara a versão atual com a versão enviada.
- Mostra as alterações antes da atualização.
- Permite manter a ficha em revisão ou aprovar e atualizar.
- Lista fichas em tabela com busca, filtros e status.
- Executa pull e push do GitHub pela interface.

## Stack

- React
- Vite
- TypeScript
- Express
- pdf-lib
- Docker
- Git CLI

## Estrutura principal

```txt
arquivo-tormenta-rpg/
  src/
  server/
  data/
    fichas/
    revisoes/
  Dockerfile
  docker-compose.yml
  README.md
```

## Armazenamento dos dados

As fichas ficam em:

```txt
data/fichas
```

Cada personagem vira um arquivo JSON. Exemplo:

```txt
data/fichas/blek.json
```

As revisões pendentes ficam em:

```txt
data/revisoes
```

Essas pastas podem ser versionadas no GitHub. Assim, quando outra pessoa fizer pull do repositório, receberá as fichas salvas.

## Identificação de ficha existente

O sistema identifica uma ficha existente pelo campo `Nome` do PDF.

Exemplo:

```txt
Nome: Blek
Arquivo salvo: data/fichas/blek.json
```

Se outro PDF também tiver `Nome: Blek`, o sistema entende que é uma nova versão da mesma ficha e abre a comparação antes de atualizar.

## Status disponíveis

```txt
aprovado
em-revisao
```

Toda ficha nova entra como `em-revisao`.

## Rodando com Docker

```bash
docker compose up --build
```

Depois acesse:

```txt
http://localhost:3333
```

## Rodando localmente sem Docker

```bash
npm install
npm run dev
```

Frontend:

```txt
http://localhost:5173
```

Backend:

```txt
http://localhost:3333
```

## Build de produção

```bash
npm install
npm run build
npm start
```

## GitHub pela interface

O botão `Puxar` executa:

```bash
git pull --ff-only
```

O botão `Enviar` executa:

```bash
git add data/fichas data/revisoes
git commit -m "Atualiza fichas RPG - data e hora"
git push
```

Para funcionar dentro do Docker, o `docker-compose.yml` monta a pasta `.git` no container.

## Modelo de PDF suportado

O parser foi feito para o modelo de ficha de Tormenta enviado como referência, com campos de formulário preenchíveis.

O projeto funciona melhor quando o PDF possui campos internos como:

- Nome
- Jogador
- Raca
- Origem
- Classe
- modFor
- modDes
- vidaMax
- manaMax
- ataque1
- item1
- Historico
- Magias

PDF escaneado como imagem não é o foco desta versão.

## Exemplo incluído

O projeto já vem com a ficha `Blek` em `data/fichas/blek.json`, extraída do PDF de referência enviado.

## Observações importantes

- O PDF enviado é processado em memória e descartado.
- O sistema não cria cópia do PDF bruto.
- O JSON é a fonte principal dos dados.
- O identificador da ficha é derivado do nome do personagem.
- Caso dois personagens tenham exatamente o mesmo nome, o sistema tratará como a mesma ficha.

## Endpoints principais

```txt
GET    /api/fichas
GET    /api/fichas/:id
POST   /api/fichas/upload
POST   /api/fichas/:id/status
GET    /api/revisoes/:id
POST   /api/revisoes/:id/aplicar
GET    /api/git/status
POST   /api/git/pull
POST   /api/git/push
GET    /api/export
```
