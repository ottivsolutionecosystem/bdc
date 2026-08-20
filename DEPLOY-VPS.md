# Manual VPS — Auttus Prospect

Este projeto **não tem back e front separados**. É um único app Next.js: tela + API + login no mesmo container. O “banco” é o Postgres. O Caddy entra na frente para HTTPS.

No final você tem: domínio → HTTPS → CRM rodando, banco persistente, migrações aplicadas, usuários criados.

---

## 0. O que precisa ter antes

### VPS
- Ubuntu 22.04 ou 24.04
- 2 vCPU / 4 GB RAM (mínimo confortável; 2 GB aguenta, mas o build fica apertado)
- 40 GB de disco
- IP público fixo
- Porta **22**, **80** e **443** abertas

### No seu computador
- O código deste repositório
- Um domínio (ex.: `crm.suaempresa.com`) apontando para o IP da VPS  
  Sem domínio o HTTPS automático não funciona. Dá para testar por IP na porta 3000, mas em produção use domínio.

### Fora deste projeto
- Fluxo no **n8n** com Webhook POST (para o grupo de vendedores). Pode estar na mesma VPS ou em outro lugar.

---

## 1. Apontar o DNS

No registrador do domínio, crie um registro **A**:

| Tipo | Nome | Valor        |
|------|------|--------------|
| A    | crm  | IP da VPS    |

Espere o DNS propagar (às vezes 5 minutos, às vezes mais). Teste:

```bash
ping crm.suaempresa.com
```

Tem que responder o IP da VPS.

---

## 2. Preparar a VPS (uma vez)

SSH:

```bash
ssh root@IP_DA_VPS
```

Atualize o sistema e instale Docker:

```bash
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh
apt install -y ufw
```

Firewall (SSH + site; **não** abra 5432):

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
ufw status
```

Crie um usuário se ainda estiver como root (opcional, mas melhor):

```bash
adduser deploy
usermod -aG docker deploy
```

---

## 3. Enviar o código para a VPS

Na **sua máquina** (pasta do projeto):

```bash
rsync -av --progress \
  --exclude node_modules \
  --exclude .next \
  --exclude .git \
  --exclude .env \
  --exclude 'test-results' \
  ./ deploy@IP_DA_VPS:~/auttus/
```

Se o SSH for como root, troque `deploy@` por `root@`.

Na VPS:

```bash
ssh deploy@IP_DA_VPS
cd ~/auttus
ls
```

Tem que aparecer `Dockerfile`, `docker-compose.prod.yml`, `prisma`, `src`, `deploy`.

---

## 4. Arquivo de ambiente (obrigatório)

```bash
cd ~/auttus
cp .env.production.example .env
nano .env
```

Preencha **tudo**:

```bash
# Senha do banco: só letras e números (sem @ # % : /)
POSTGRES_PASSWORD=UmaSenhaForteDoBanco123

# Gere na VPS com: openssl rand -base64 32
AUTH_SECRET=cole_aqui_o_resultado

DOMAIN=crm.suaempresa.com
AUTH_URL=https://crm.suaempresa.com
ACME_EMAIL=seuemail@suaempresa.com

AUTH_TRUST_HOST=true
AUTH_DEV_RESET_LINKS=false

# Opcional. Se vazio, cole a URL depois em Configurações da campanha.
SELLERS_GROUP_WEBHOOK_URL=
```

Gere o `AUTH_SECRET`:

```bash
openssl rand -base64 32
```

Cole no `.env`. Salve (`Ctrl+O`, Enter, `Ctrl+X` no nano).

**Não commite e não compartilhe o `.env`.**

---

## 5. Subir banco + app + HTTPS

Ainda em `~/auttus`:

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

A primeira vez demora (build do Next). Acompanhe:

```bash
docker compose -f docker-compose.prod.yml logs -f
```

O que precisa aparecer:
- Postgres: `database system is ready to accept connections`
- App: `Migration(s) applied` **ou** `No pending migrations` e depois `Ready`
- Caddy: certificado Let’s Encrypt para o domínio

Saia dos logs com `Ctrl+C` (os containers continuam rodando).

Status:

```bash
docker compose -f docker-compose.prod.yml ps
```

Os três (`postgres`, `app`, `caddy`) têm que estar `Up`.

---

## 6. Criar usuários e pareceres (só na primeira vez)

O container **não** cria login sozinho. Rode o seed **uma vez**:

```bash
docker compose -f docker-compose.prod.yml exec app npx prisma db seed
```

Logins iniciais (troque a senha depois):

| Papel       | E-mail                 | Senha    |
|-------------|------------------------|----------|
| Admin       | admin@demo.com         | demo1234 |
| Supervisora | supervisor@demo.com    | demo1234 |
| Agentes     | ana@demo.com, maria@demo.com, julia@demo.com | demo1234 |
| Vendedor    | vendedor@demo.com      | demo1234 |

Rodar o seed de novo **não** reseta senha de quem já existe.

---

## 7. Conferir no navegador

Abra `https://crm.suaempresa.com`

1. Tela de login carrega (cadeado HTTPS).
2. Entre com `admin@demo.com` / `demo1234`.
3. Vá em **Usuários** e **troque as senhas**.
4. Crie a campanha → vincule pelo menos uma agente → **Configurações → Status Ativa → Salvar**.
5. Importe a base em **Importar**.
6. Cole o webhook do n8n em **Configurações → Webhook do grupo de vendedores**.
7. Agente entra, registra parecer de **interesse** ou **visita agendada**.
8. Aparece **Avisar grupo de vendedores**. Teste. A mensagem tem que chegar no n8n / grupo.

Ranking na TV: `/campaigns/ID/ranking?tv=1` (precisa estar logado).

---

## 8. Ligar o n8n (grupo de vendedores)

No n8n:

1. Nó **Webhook**, método **POST**.
2. Ative o fluxo e copie a URL de produção.
3. No próximo nó (WhatsApp / Evolution / etc.), use:

```text
{{$json.text}}
```

Esse campo já vem com nome, telefone, carro, visita (horário de Cuiabá) e link do WhatsApp.

Cole a URL:

- na campanha (**Configurações**), **ou**
- em `SELLERS_GROUP_WEBHOOK_URL` no `.env` e recrie o app:

```bash
docker compose -f docker-compose.prod.yml up -d --force-recreate app
```

**URL certa**

| Onde o n8n está | URL que o CRM deve chamar |
|-----------------|---------------------------|
| Internet / outro servidor | `https://n8n.seudominio.com/webhook/...` |
| Mesma VPS, outro container Docker | `http://NOME_DO_SERVICO:5678/webhook/...` |
| Nunca | `http://localhost:...` (localhost dentro do CRM é o próprio app) |

Se o botão **não aparecer**, o webhook não está configurado. Se aparecer e der erro, o CRM não alcança o n8n (firewall, URL errada, fluxo inativo).

---

## 9. Checklist “está 100%”

- [ ] `https://SEU_DOMINIO` abre o login com cadeado
- [ ] Admin entra
- [ ] Senhas demo trocadas
- [ ] Campanha **Ativa** com ≥ 1 agente
- [ ] Base importada
- [ ] Agente vê a fila em **Operação**
- [ ] Parecer salva
- [ ] Botão do grupo dispara o n8n
- [ ] Ranking abre e mostra **Horário de Cuiabá**
- [ ] Postgres **não** está publicado na internet (`ufw` sem 5432)

---

## 10. Atualizar o sistema depois

Na sua máquina, envie o código de novo (`rsync` igual ao passo 3) e na VPS:

```bash
cd ~/auttus
docker compose -f docker-compose.prod.yml up --build -d
```

O start já roda `prisma migrate deploy`. **Não** rode o seed de novo só por atualizar, a menos que queira garantir pareceres padrão.

---

## 11. Comandos úteis

```bash
cd ~/auttus

# logs
docker compose -f docker-compose.prod.yml logs -f app
docker compose -f docker-compose.prod.yml logs -f caddy
docker compose -f docker-compose.prod.yml logs -f postgres

# parar / subir
docker compose -f docker-compose.prod.yml stop
docker compose -f docker-compose.prod.yml up -d

# backup do banco (guarde o arquivo fora da VPS)
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U auttus auttus > backup-$(date +%F).sql
```

Restaurar backup (apaga o estado atual do banco):

```bash
cat backup-AAAA-MM-DD.sql | docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U auttus auttus
```

---

## 12. Se quebrar

**Build falhou / memória**  
A VPS com 2 GB pode morrer no `next build`. Crie swap:

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
```

E rode o `up --build` de novo.

**Site não abre / sem HTTPS**  
- DNS ainda não aponta para a VPS  
- Portas 80/443 fechadas no painel da VPS (além do `ufw`)  
- `DOMAIN` no `.env` diferente do DNS  
Veja: `docker compose -f docker-compose.prod.yml logs caddy`

**Login não entra / redireciona errado**  
- `AUTH_URL` tem que ser exatamente `https://SEU_DOMINIO` (sem barra no final)  
- `AUTH_SECRET` preenchido  
Recrie o app depois de alterar `.env`.

**Migração não rodou**  
```bash
docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy
```

**Não consigo logar (usuário inexistente)**  
O seed não rodou. Volte ao passo 6.

**Botão de avisar vendedores não aparece**  
Campanha sem webhook + env `SELLERS_GROUP_WEBHOOK_URL` vazio. Cole a URL e peça para a agente **recarregar** a Operação. O botão só sai depois de visita agendada ou interesse quente/morno.

**Postgres na internet**  
Este compose de produção **não** abre a porta 5432. Não use o `docker-compose.yml` de desenvolvimento na VPS (aquele publica 5432).

---

## 13. O que não fazer

- Não rode `docker compose up` (arquivo de **dev**) na VPS.
- Não abra a porta 5432 no firewall.
- Não deixe `AUTH_SECRET` como `change-me-in-production`.
- Não use senha do banco com `@`, `#`, `%` ou `/` (quebra a URL).
- Não apague o volume `bdc_postgres_data` — isso apaga todos os dados.
