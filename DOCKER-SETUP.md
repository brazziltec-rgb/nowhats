# Configuração Docker PostgreSQL - NoWhats

Este guia explica como configurar o projeto para usar PostgreSQL com Docker.

## Pré-requisitos

- Docker e Docker Compose instalados
- Node.js 18+ instalado

## Configuração Inicial

### 1. Iniciar o Container PostgreSQL

```bash
# Iniciar os containers em background
docker-compose up -d

# Verificar se os containers estão rodando
docker-compose ps
```

### 2. Configurar Variáveis de Ambiente

O arquivo `.env` do backend já está configurado para PostgreSQL:

```env
DB_HOST=localhost
DB_PORT=5433
DB_NAME=atendezap
DB_USER=postgres
DB_PASSWORD=postgres
```

### 3. Executar Migrações

```bash
# Executar as migrações do banco
node setup-database.js
```

### 4. Iniciar o Backend

```bash
cd backend
npm run dev
```

## Serviços Disponíveis

### PostgreSQL
- **Host:** localhost
- **Porta:** 5433 (mapeada para 5432 no container)
- **Banco:** atendezap
- **Usuário:** postgres
- **Senha:** postgres

### pgAdmin (Opcional)
- **URL:** http://localhost:8080
- **Email:** admin@nowhats.com
- **Senha:** admin123

## Comandos Úteis

```bash
# Parar os containers
docker-compose down

# Parar e remover volumes (CUIDADO: apaga dados)
docker-compose down -v

# Ver logs do PostgreSQL
docker-compose logs postgres

# Acessar o container PostgreSQL
docker-compose exec postgres psql -U postgres -d atendezap

# Backup do banco
docker-compose exec postgres pg_dump -U postgres atendezap > backup.sql

# Restaurar backup
docker-compose exec -T postgres psql -U postgres atendezap < backup.sql
```

## Estrutura do Banco

O banco será criado automaticamente com as seguintes tabelas:
- `users` - Usuários do sistema
- `profiles` - Perfis dos usuários
- `channels` - Canais de WhatsApp
- `contacts` - Contatos
- `messages` - Mensagens
- `tickets` - Tickets de atendimento
- `quick_replies` - Respostas rápidas

## Troubleshooting

### Container não inicia
```bash
# Verificar logs
docker-compose logs postgres

# Verificar se a porta 5433 está livre
netstat -an | findstr 5433
```

### Erro de conexão
1. Verificar se o container está rodando: `docker-compose ps`
2. Verificar variáveis de ambiente no `.env`
3. Verificar se não há firewall bloqueando a porta 5432

### Reset completo
```bash
# Parar tudo e limpar
docker-compose down -v
docker-compose up -d
node setup-database.js
```

## Migração do SQLite

Se você tinha dados no SQLite e quer migrar:

1. Exporte os dados do SQLite
2. Configure o PostgreSQL
3. Execute as migrações
4. Importe os dados exportados

**Nota:** O projeto agora está configurado para usar PostgreSQL por padrão. O SQLite foi removido da configuração principal.