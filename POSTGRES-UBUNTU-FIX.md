# 🐘 Correção PostgreSQL Ubuntu - NoWhats

## Problema Identificado

```
✘ Container nowhats_postgres       Error
dependency failed to start: container nowhats_postgres is unhealthy
```

## Causas Mais Comuns

### 1. **Permissões de Diretório**
- PostgreSQL precisa de UID 999 no diretório de dados
- Diretório `data/postgres` com permissões incorretas
- Dados corrompidos de execuções anteriores

### 2. **Configuração .env**
- Variáveis PostgreSQL ausentes ou incorretas
- Credenciais inválidas
- Host/porta mal configurados

### 3. **Volumes Docker**
- Volumes corrompidos de execuções anteriores
- Conflitos com containers antigos

### 4. **Recursos do Sistema**
- Memória insuficiente
- Espaço em disco insuficiente
- Conflitos de porta

## Solução Rápida

### Opção 1: Script Automático (Recomendado)

```bash
# Baixar e executar o script de correção específico
bash fix-postgres-ubuntu.sh
```

### Opção 2: Correção Manual

#### Passo 1: Parar e Limpar
```bash
# Parar todos os containers
docker-compose -f docker-compose.prod.yml down --remove-orphans

# Remover containers órfãos
docker ps -a --filter "name=postgres" --format "{{.Names}}" | xargs -r docker rm -f

# Limpar volumes PostgreSQL
docker volume ls --filter "name=postgres" -q | xargs -r docker volume rm -f
```

#### Passo 2: Corrigir Permissões
```bash
# Criar diretório se não existir
mkdir -p data/postgres

# Remover dados corrompidos
sudo rm -rf data/postgres/pgdata

# Corrigir permissões (PostgreSQL usa UID 999)
sudo chown -R 999:999 data/postgres
chmod -R 755 data/postgres
```

#### Passo 3: Verificar .env
```bash
# Verificar se as variáveis existem
grep -E "^(DB_HOST|DB_PORT|DB_NAME|DB_USER|DB_PASSWORD)=" .env

# Se alguma estiver faltando, adicionar:
echo "DB_HOST=postgres" >> .env
echo "DB_PORT=5432" >> .env
echo "DB_NAME=nowhats" >> .env
echo "DB_USER=postgres" >> .env
echo "DB_PASSWORD=sua_senha_aqui" >> .env
```

#### Passo 4: Iniciar Apenas PostgreSQL
```bash
# Iniciar apenas o PostgreSQL
docker-compose -f docker-compose.prod.yml up -d postgres

# Aguardar ficar saudável (pode levar até 2 minutos)
watch docker-compose -f docker-compose.prod.yml ps postgres
```

#### Passo 5: Verificar Logs
```bash
# Se não iniciar, verificar logs
docker-compose -f docker-compose.prod.yml logs postgres
```

#### Passo 6: Testar Conexão
```bash
# Testar conexão interna
docker exec nowhats_postgres psql -U postgres -d nowhats -c "SELECT version();"
```

#### Passo 7: Iniciar Demais Containers
```bash
# Se PostgreSQL estiver OK, iniciar todos
docker-compose -f docker-compose.prod.yml up -d
```

## Verificação de Problemas

### Verificar Status
```bash
# Status dos containers
docker-compose -f docker-compose.prod.yml ps

# Logs específicos
docker-compose -f docker-compose.prod.yml logs postgres

# Uso de recursos
docker stats nowhats_postgres
```

### Verificar Permissões
```bash
# Verificar proprietário do diretório
ls -la data/postgres

# Deve mostrar: drwxr-xr-x ... 999 999 ... postgres
```

### Verificar Conectividade
```bash
# Testar porta PostgreSQL
netstat -tuln | grep 5432

# Testar conexão externa
psql -h localhost -p 5432 -U postgres -d nowhats
```

## Problemas Específicos Ubuntu

### AppArmor (Ubuntu/Debian)
```bash
# Se houver problemas com AppArmor
sudo aa-status | grep docker

# Desabilitar temporariamente se necessário
sudo systemctl stop apparmor
```

### SELinux (se habilitado)
```bash
# Verificar SELinux
getenforce

# Definir contexto correto
sudo setsebool -P container_manage_cgroup true
```

### Snap Docker (Ubuntu)
```bash
# Se usando Docker via Snap, pode haver problemas
# Recomenda-se instalar via apt:
sudo snap remove docker
sudo apt update
sudo apt install docker.io docker-compose
```

## Configurações Avançadas

### Aumentar Timeout de Health Check
No `docker-compose.prod.yml`:
```yaml
postgres:
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U postgres"]
    interval: 10s
    timeout: 5s
    retries: 10  # Aumentar de 5 para 10
    start_period: 60s  # Aumentar tempo inicial
```

### Configurar Memória Compartilhada
```yaml
postgres:
  shm_size: 256mb  # Adicionar se necessário
```

### Configurar Limites de Recursos
```yaml
postgres:
  deploy:
    resources:
      limits:
        memory: 512M
      reservations:
        memory: 256M
```

## Scripts de Diagnóstico

### Diagnóstico Completo
```bash
bash diagnose-containers.sh
```

### Logs Detalhados
```bash
# Logs com timestamp
docker-compose -f docker-compose.prod.yml logs -t postgres

# Seguir logs em tempo real
docker-compose -f docker-compose.prod.yml logs -f postgres
```

## Prevenção

### Backup Regular
```bash
# Backup do banco
docker exec nowhats_postgres pg_dump -U postgres nowhats > backup.sql
```

### Monitoramento
```bash
# Script para monitorar saúde
watch 'docker-compose -f docker-compose.prod.yml ps && echo "" && docker stats --no-stream nowhats_postgres'
```

### Limpeza Periódica
```bash
# Limpeza semanal
docker system prune -f
docker volume prune -f
```

## Suporte

Se o problema persistir:

1. Execute: `bash diagnose-containers.sh`
2. Colete logs: `docker-compose logs postgres > postgres-logs.txt`
3. Verifique recursos: `df -h && free -h`
4. Reporte o problema com os logs coletados

---

**Nota**: Este guia é específico para Ubuntu 22.04. Para outras distribuições, alguns comandos podem variar.