# CRM · Campanhas de Ligação

Sistema de operação e supervisão de campanhas de ligação, com distribuição de base, pareceres, dashboard e encaminhamento para vendas.

## Requisitos

- Node.js 22+
- PostgreSQL 16+ (`docker compose up -d postgres` ou instância local)
- Variáveis em `.env` (veja `.env.example`)

Para subir Postgres **e** o app em containers: `docker compose --profile full up --build`.

## Subir o ambiente

```bash
cp .env.example .env
# Ajuste AUTH_SECRET (ex: openssl rand -base64 32)

docker compose up -d postgres
npm install
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Usuários demo

Senha de todos: `demo1234`

| Papel        | E-mail                 |
|--------------|------------------------|
| Admin        | admin@demo.com         |
| Supervisora  | supervisor@demo.com    |
| Agentes      | ana@demo.com, maria@demo.com, julia@demo.com |
| Vendedor     | vendedor@demo.com      |

## Fluxo típico

1. Admin cadastra a equipe em **Usuários**.
2. Supervisor cria a campanha (status **Rascunho**).
3. Vincula agentes, ajusta pareceres e importa a planilha em **Configurações** / **Importar**.
4. Ativa a campanha — só então a fila de **Operação** libera as ligações.
5. Agentes registram pareceres; a ficha do cliente e o **Histórico** acompanham o tratamento.
6. Contatos quentes podem ir para o vendedor, que acompanha oportunidades e agenda em `/sales`.

O seed **não** cria campanha nem base. Crie a campanha, vincule as agentes, importe a planilha e ative para a fila funcionar.

Na operação há **Ligar WhatsApp** (VoIP Wavoip nesta tela), **Ligar celular** (discador do aparelho) e **Conversar** (WhatsApp). Cole o token em **Configurações** da campanha (ou no cadastro da agente) para o VoIP. O CRM registra o parecer.

## Scripts

```bash
npm run dev          # desenvolvimento
npm run build        # build de produção
npm run lint         # eslint
npm run test:e2e     # Playwright (Chromium)
npx prisma db seed   # garante usuários, pareceres e remove campanhas de demonstração
```
