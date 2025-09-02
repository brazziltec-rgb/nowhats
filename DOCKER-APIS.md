# Configuração das APIs WhatsApp no Docker

Este documento descreve como configurar e usar as APIs Baileys, Evolution e Web.js integradas ao NoWhats via Docker.

## 🚀 Início Rápido

### 1. Configurar Variáveis de Ambiente

```bash
# Copiar arquivo de exemplo
cp .env.docker.example .env

# Editar as variáveis necessárias
nano .env
```

### 2. Iniciar os Serviços

```bash
# Iniciar todos os serviços
docker-compose up -d

# Verificar status
docker-compose ps
```

### 3. Verificar Logs

```bash
# Logs do backend principal (Baileys)
docker-compose logs -f backend

# Logs da Evolution API
docker-compose logs -f evolution-api

# Logs da Web.js API
docker-compose logs -f webjs-api
```

## 📱 APIs Disponíveis

### Backend Principal (Baileys)
- **Porta:** 3001
- **URL:** http://localhost:3001
- **Descrição:** Backend principal do NoWhats com Baileys integrado
- **Funcionalidades:**
  - Gerenciamento de canais
  - Autenticação de usuários
  - API REST completa
  - QR Code nativo

### Evolution API
- **Porta:** 8081
- **URL:** http://localhost:8081
- **Descrição:** API Evolution para WhatsApp
- **Funcionalidades:**
  - Multi-instâncias
  - Webhooks
  - API REST robusta
  - Suporte a grupos

### Web.js API
- **Porta:** 3002
- **URL:** http://localhost:3002
- **Descrição:** API baseada em whatsapp-web.js
- **Funcionalidades:**
  - Interface simples
  - QR Code direto
  - Sessões persistentes
  - Baixo consumo de recursos

## 🔧 Como Usar

### Nova Conexão (Recomendado)

Use o endpoint integrado que cria o canal e inicia a conexão automaticamente:

```bash
# Criar nova conexão
curl -X POST http://localhost:3001/api/channels/create-and-connect \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "name": "Minha Conexão",
    "api": "baileys"
  }'
```

**APIs disponíveis:**
- `baileys` - Recomendado para uso geral
- `evolution` - Para funcionalidades avançadas
- `webjs` - Para simplicidade

### Obter QR Code

```bash
# Obter QR Code do canal
curl -X GET http://localhost:3001/api/channels/{CHANNEL_ID}/qr \
  -H "Authorization: Bearer SEU_TOKEN"
```

### Verificar Status

```bash
# Status do canal
curl -X GET http://localhost:3001/api/channels/{CHANNEL_ID}/status \
  -H "Authorization: Bearer SEU_TOKEN"
```

## 🔑 Autenticação

### Chaves de API

Configure as seguintes variáveis no arquivo `.env`:

```env
# Evolution API
EVOLUTION_API_KEY=sua-chave-evolution-aqui

# Web.js API
WEBJS_API_KEY=sua-chave-webjs-aqui

# JWT para o backend principal
JWT_SECRET=sua-chave-jwt-super-secreta
```

### Obter Token JWT

```bash
# Login para obter token
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "seu@email.com",
    "password": "suasenha"
  }'
```

## 📊 Monitoramento

### Health Checks

```bash
# Backend principal
curl http://localhost:3001/health

# Evolution API
curl http://localhost:8081/

# Web.js API
curl http://localhost:3002/health
```

### pgAdmin (Banco de Dados)
- **URL:** http://localhost:8080
- **Email:** admin@nowhats.com
- **Senha:** admin123

## 🛠️ Comandos Úteis

### Gerenciamento de Containers

```bash
# Parar todos os serviços
docker-compose down

# Rebuild e restart
docker-compose up -d --build

# Remover volumes (CUIDADO: apaga dados)
docker-compose down -v

# Ver logs em tempo real
docker-compose logs -f
```

### Backup e Restore

```bash
# Backup do banco
docker exec nowhats-postgres pg_dump -U postgres atendezap > backup.sql

# Restore do banco
docker exec -i nowhats-postgres psql -U postgres atendezap < backup.sql
```

## 🔍 Troubleshooting

### Problemas Comuns

#### 1. Container não inicia
```bash
# Verificar logs
docker-compose logs nome-do-servico

# Verificar recursos
docker system df
docker system prune
```

#### 2. QR Code não aparece
```bash
# Verificar status da sessão
curl http://localhost:3001/api/channels/{CHANNEL_ID}/status

# Restart do container
docker-compose restart backend
```

#### 3. Erro de conexão com banco
```bash
# Verificar se postgres está rodando
docker-compose ps postgres

# Verificar logs do postgres
docker-compose logs postgres
```

#### 4. Porta já em uso
```bash
# Verificar portas em uso
netstat -tulpn | grep :3001

# Alterar porta no docker-compose.yml
# "3001:3001" -> "3003:3001"
```

### Reset Completo

```bash
# Parar tudo e limpar
docker-compose down -v
docker system prune -a

# Rebuild completo
docker-compose up -d --build
```

## 📁 Estrutura de Arquivos

```
.
├── docker/
│   ├── baileys/
│   │   └── Dockerfile
│   ├── evolution/
│   │   └── Dockerfile
│   └── webjs/
│       ├── Dockerfile
│       ├── package.json
│       └── server.js
├── docker-compose.yml
├── .env.docker.example
└── DOCKER-APIS.md
```

## 🔒 Segurança

### Recomendações

1. **Altere todas as senhas padrão**
2. **Use chaves JWT fortes**
3. **Configure firewall adequadamente**
4. **Mantenha backups regulares**
5. **Monitore logs regularmente**

### Variáveis Sensíveis

Nunca commite o arquivo `.env` com dados reais. Use sempre:
- Senhas complexas
- Chaves JWT de pelo menos 32 caracteres
- API keys únicas para cada ambiente

## 📞 Suporte

Para problemas ou dúvidas:
1. Verifique os logs primeiro
2. Consulte este documento
3. Abra uma issue no repositório
4. Entre em contato com a equipe de desenvolvimento

---

**Nota:** Este setup é otimizado para desenvolvimento e produção. Para ambientes de alta disponibilidade, considere usar orquestradores como Kubernetes.