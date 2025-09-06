# 🔧 NoWhats - Guia de Configuração do Arquivo .env

## 📋 Visão Geral

O arquivo `.env` contém todas as configurações necessárias para executar o NoWhats. Este guia explica cada variável e como configurá-las corretamente.

## 🚀 Configuração Rápida

### Opção 1: Geração Automática (Recomendado)

**Windows (PowerShell):**
```powershell
.\generate-env.ps1
```

**Linux/Mac:**
```bash
chmod +x generate-env.sh
./generate-env.sh
```

### Opção 2: Configuração Manual

1. Copie o arquivo de exemplo:
   ```bash
   cp .env.example .env
   ```

2. Edite o arquivo `.env` com suas configurações

## 📝 Variáveis de Configuração

### 🔧 Configurações Gerais

| Variável | Descrição | Exemplo | Obrigatório |
|----------|-----------|---------|-------------|
| `NODE_ENV` | Ambiente de execução | `development`, `production`, `test` | ✅ |
| `PORT` | Porta do backend | `3006` | ✅ |
| `FRONTEND_PORT` | Porta do frontend | `3000` | ✅ |

### 🗄️ Banco de Dados PostgreSQL

| Variável | Descrição | Exemplo | Obrigatório |
|----------|-----------|---------|-------------|
| `DB_HOST` | Host do PostgreSQL | `postgres` (Docker) ou `localhost` | ✅ |
| `DB_PORT` | Porta do PostgreSQL | `5432` | ✅ |
| `DB_NAME` | Nome do banco | `nowhats` | ✅ |
| `DB_USER` | Usuário do banco | `postgres` | ✅ |
| `DB_PASSWORD` | Senha do banco | `senha_super_segura_123` | ✅ |
| `DATABASE_URL` | URL completa de conexão | `postgresql://user:pass@host:port/db` | ✅ |

**⚠️ Importante:** Use senhas fortes com pelo menos 16 caracteres!

### 🔐 Autenticação JWT

| Variável | Descrição | Exemplo | Obrigatório |
|----------|-----------|---------|-------------|
| `JWT_SECRET` | Chave secreta para JWT | `chave_jwt_super_secreta_aqui` | ✅ |
| `JWT_EXPIRES_IN` | Tempo de expiração | `7d`, `24h`, `3600s` | ✅ |

**💡 Dica:** Gere chaves JWT com `openssl rand -base64 64`

### 🌐 URLs da Aplicação

| Variável | Descrição | Exemplo | Obrigatório |
|----------|-----------|---------|-------------|
| `APP_URL` | URL principal | `https://meudominio.com` | ✅ |
| `API_URL` | URL da API | `https://meudominio.com/api` | ✅ |
| `FRONTEND_URL` | URL do frontend | `https://meudominio.com` | ✅ |
| `CORS_ORIGIN` | Origem permitida CORS | `https://meudominio.com` | ✅ |

### 📱 APIs WhatsApp

| Variável | Descrição | Exemplo | Obrigatório |
|----------|-----------|---------|-------------|
| `BAILEYS_API_URL` | URL da API Baileys | `http://baileys-api:3001` | ✅ |
| `EVOLUTION_API_URL` | URL da API Evolution | `http://evolution-api:8080` | ✅ |
| `WEBJS_API_URL` | URL da API Web.js | `http://webjs-api:3003` | ✅ |
| `BAILEYS_AUTH_KEY` | Chave de autenticação Baileys | `chave_baileys_aqui` | ❌ |
| `EVOLUTION_API_KEY` | Chave da API Evolution | `chave_evolution_aqui` | ❌ |
| `WEBJS_AUTH_KEY` | Chave de autenticação Web.js | `chave_webjs_aqui` | ❌ |

### 🔴 Redis (Cache)

| Variável | Descrição | Exemplo | Obrigatório |
|----------|-----------|---------|-------------|
| `REDIS_HOST` | Host do Redis | `redis` (Docker) ou `localhost` | ✅ |
| `REDIS_PORT` | Porta do Redis | `6379` | ✅ |
| `REDIS_PASSWORD` | Senha do Redis | `senha_redis_123` | ❌ |
| `REDIS_URL` | URL completa do Redis | `redis://:senha@redis:6379` | ❌ |

### 🔒 Configurações de Segurança

| Variável | Descrição | Exemplo | Obrigatório |
|----------|-----------|---------|-------------|
| `SESSION_SECRET` | Chave secreta para sessões | `chave_sessao_super_secreta` | ✅ |
| `SESSION_MAX_AGE` | Tempo máximo de sessão (ms) | `86400000` (24h) | ✅ |
| `SECURE_COOKIES` | Usar cookies seguros | `true` (HTTPS), `false` (HTTP) | ✅ |
| `SAME_SITE` | Configuração SameSite | `strict`, `lax`, `none` | ✅ |
| `WEBHOOK_SECRET` | Chave secreta para webhooks | `chave_webhook_secreta` | ❌ |

### 📧 Email (Opcional)

| Variável | Descrição | Exemplo | Obrigatório |
|----------|-----------|---------|-------------|
| `SMTP_HOST` | Servidor SMTP | `smtp.gmail.com` | ❌ |
| `SMTP_PORT` | Porta SMTP | `587` | ❌ |
| `SMTP_SECURE` | Usar SSL/TLS | `false` (STARTTLS), `true` (SSL) | ❌ |
| `SMTP_USER` | Usuário SMTP | `seu_email@gmail.com` | ❌ |
| `SMTP_PASS` | Senha SMTP | `senha_app_gmail` | ❌ |
| `MAIL_FROM` | Email remetente | `noreply@meudominio.com` | ❌ |
| `MAIL_FROM_NAME` | Nome do remetente | `NoWhats` | ❌ |

### 📊 Logs e Monitoramento

| Variável | Descrição | Exemplo | Obrigatório |
|----------|-----------|---------|-------------|
| `LOG_LEVEL` | Nível de log | `error`, `warn`, `info`, `debug` | ✅ |
| `LOG_FILE` | Arquivo de log | `/opt/nowhats/logs/app.log` | ❌ |
| `DEBUG` | Ativar modo debug | `true`, `false` | ❌ |
| `METRICS_ENABLED` | Ativar métricas | `true`, `false` | ❌ |
| `HEALTH_CHECK_ENABLED` | Ativar health checks | `true`, `false` | ❌ |

### ⚡ Rate Limiting

| Variável | Descrição | Exemplo | Obrigatório |
|----------|-----------|---------|-------------|
| `RATE_LIMIT_WINDOW` | Janela de tempo (min) | `15` | ❌ |
| `RATE_LIMIT_MAX` | Máx. requisições/janela | `100` | ❌ |
| `LOGIN_RATE_LIMIT` | Limite de login/min | `5` | ❌ |

### 📁 Upload de Arquivos

| Variável | Descrição | Exemplo | Obrigatório |
|----------|-----------|---------|-------------|
| `UPLOAD_MAX_SIZE` | Tamanho máximo | `50mb` | ❌ |
| `UPLOAD_PATH` | Diretório de uploads | `/opt/nowhats/uploads` | ❌ |
| `UPLOAD_ALLOWED_TYPES` | Tipos permitidos | `image/jpeg,image/png,application/pdf` | ❌ |

## 🔧 Configurações por Ambiente

### 🏠 Desenvolvimento Local

```env
NODE_ENV=development
DEBUG=true
LOG_LEVEL=debug
SECURE_COOKIES=false
HTTPS_REDIRECT=false
CORS_ORIGIN=http://localhost:3000
FRONTEND_URL=http://localhost:3000
```

### 🚀 Produção

```env
NODE_ENV=production
DEBUG=false
LOG_LEVEL=info
SECURE_COOKIES=true
HTTPS_REDIRECT=true
CORS_ORIGIN=https://meudominio.com
FRONTEND_URL=https://meudominio.com
```

### 🧪 Testes

```env
NODE_ENV=test
DEBUG=false
LOG_LEVEL=error
DB_NAME=nowhats_test
```

## 🔐 Gerando Senhas Seguras

### Usando OpenSSL (Linux/Mac/Windows com WSL)

```bash
# Senha de 32 caracteres
openssl rand -base64 32 | tr -d "=+/" | cut -c1-32

# Chave JWT (64 caracteres)
openssl rand -base64 64 | tr -d "=+/" | cut -c1-50
```

### Usando PowerShell (Windows)

```powershell
# Gerar senha aleatória
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})
```

### Usando Node.js

```javascript
// Gerar senha de 32 caracteres
require('crypto').randomBytes(32).toString('base64').replace(/[+/=]/g, '').substring(0, 32)
```

## ⚠️ Boas Práticas de Segurança

### ✅ Faça

- ✅ Use senhas com pelo menos 32 caracteres
- ✅ Gere chaves únicas para cada ambiente
- ✅ Mantenha o arquivo `.env` fora do controle de versão
- ✅ Use HTTPS em produção
- ✅ Configure CORS adequadamente
- ✅ Ative rate limiting
- ✅ Use cookies seguros em produção
- ✅ Configure logs apropriados

### ❌ Não Faça

- ❌ Nunca commite o arquivo `.env`
- ❌ Não use senhas fracas ou padrão
- ❌ Não reutilize chaves entre ambientes
- ❌ Não desative HTTPS em produção
- ❌ Não use `CORS_ORIGIN=*` em produção
- ❌ Não exponha informações sensíveis nos logs

## 🔍 Validação da Configuração

### Script de Validação

Crie um arquivo `validate-env.js`:

```javascript
const requiredVars = [
  'NODE_ENV',
  'PORT',
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'JWT_SECRET',
  'FRONTEND_URL'
];

const missing = requiredVars.filter(varName => !process.env[varName]);

if (missing.length > 0) {
  console.error('❌ Variáveis obrigatórias não encontradas:');
  missing.forEach(varName => console.error(`  - ${varName}`));
  process.exit(1);
}

console.log('✅ Todas as variáveis obrigatórias estão configuradas!');
```

Execute:
```bash
node -r dotenv/config validate-env.js
```

## 🐳 Configuração Docker

### docker-compose.yml

```yaml
version: '3.8'
services:
  backend:
    build: .
    env_file:
      - .env
    ports:
      - "${PORT}:${PORT}"
    depends_on:
      - postgres
      - redis
```

### Dockerfile

```dockerfile
# Não copie o arquivo .env para a imagem
# Use variáveis de ambiente do Docker
ENV NODE_ENV=production
```

## 🔧 Troubleshooting

### Problemas Comuns

#### 1. "Arquivo .env não encontrado"
```bash
# Verifique se o arquivo existe
ls -la .env

# Se não existir, copie do exemplo
cp .env.example .env
```

#### 2. "Erro de conexão com o banco"
```bash
# Verifique as configurações do banco
echo $DATABASE_URL

# Teste a conexão
psql $DATABASE_URL -c "SELECT 1;"
```

#### 3. "JWT Secret inválido"
```bash
# Gere uma nova chave JWT
openssl rand -base64 64 | tr -d "=+/" | cut -c1-50
```

#### 4. "CORS Error"
```bash
# Verifique se CORS_ORIGIN está correto
echo $CORS_ORIGIN
echo $FRONTEND_URL
```

### Logs de Debug

Para debugar problemas de configuração:

```env
DEBUG=true
LOG_LEVEL=debug
NODE_ENV=development
```

## 📚 Recursos Adicionais

- [Documentação do dotenv](https://github.com/motdotla/dotenv)
- [Boas práticas de segurança Node.js](https://nodejs.org/en/docs/guides/security/)
- [Configuração PostgreSQL](https://www.postgresql.org/docs/)
- [Configuração Redis](https://redis.io/documentation)

## 🆘 Suporte

Se você encontrar problemas:

1. Verifique este guia
2. Execute o script de validação
3. Consulte os logs da aplicação
4. Abra uma issue no repositório

---

**📝 Nota:** Este guia é atualizado regularmente. Sempre consulte a versão mais recente no repositório oficial.