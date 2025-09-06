#!/bin/bash

# NoWhats - Correção Específica PostgreSQL Ubuntu
# Resolve problema: "dependency failed to start: container nowhats_postgres is unhealthy"

set -e

echo "🐘 NoWhats - Correção PostgreSQL Ubuntu"
echo "======================================"
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# Verificar se está rodando como root
if [[ $EUID -eq 0 ]]; then
   log_error "Este script não deve ser executado como root"
   log_info "Execute: bash fix-postgres-ubuntu.sh"
   exit 1
fi

# Detectar arquivo compose
COMPOSE_FILE="docker-compose.prod.yml"
if [[ ! -f "$COMPOSE_FILE" ]]; then
    COMPOSE_FILE="docker-compose.yml"
fi

if [[ ! -f "$COMPOSE_FILE" ]]; then
    log_error "Nenhum arquivo docker-compose encontrado"
    exit 1
fi

log_info "Usando arquivo: $COMPOSE_FILE"

# Função para parar containers PostgreSQL
stop_postgres() {
    log_info "Parando container PostgreSQL..."
    
    # Parar container específico
    docker-compose -f "$COMPOSE_FILE" stop postgres 2>/dev/null || true
    docker-compose -f "$COMPOSE_FILE" rm -f postgres 2>/dev/null || true
    
    # Remover containers órfãos do PostgreSQL
    local postgres_containers=$(docker ps -a --filter "name=postgres" --format "{{.Names}}" 2>/dev/null || true)
    if [[ -n "$postgres_containers" ]]; then
        log_info "Removendo containers PostgreSQL órfãos..."
        echo "$postgres_containers" | xargs -r docker rm -f
    fi
    
    log_success "Container PostgreSQL parado"
}

# Função para corrigir permissões do diretório PostgreSQL
fix_postgres_permissions() {
    log_info "Corrigindo permissões do PostgreSQL..."
    
    # Criar diretório se não existir
    if [[ ! -d "data/postgres" ]]; then
        mkdir -p data/postgres
        log_success "Diretório data/postgres criado"
    fi
    
    # Remover dados corrompidos se existirem
    if [[ -d "data/postgres/pgdata" ]]; then
        log_warning "Removendo dados PostgreSQL corrompidos..."
        sudo rm -rf data/postgres/pgdata
        log_success "Dados corrompidos removidos"
    fi
    
    # Corrigir permissões (PostgreSQL precisa de UID 999)
    sudo chown -R 999:999 data/postgres 2>/dev/null || true
    chmod -R 755 data/postgres 2>/dev/null || true
    
    log_success "Permissões do PostgreSQL corrigidas"
}

# Função para verificar e corrigir arquivo .env
fix_env_postgres() {
    log_info "Verificando configurações PostgreSQL no .env..."
    
    if [[ ! -f ".env" ]]; then
        log_error "Arquivo .env não encontrado"
        log_info "Execute primeiro: bash fix-nowhats-ubuntu.sh"
        exit 1
    fi
    
    # Verificar variáveis essenciais do PostgreSQL
    local required_vars=("DB_HOST" "DB_PORT" "DB_NAME" "DB_USER" "DB_PASSWORD")
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if ! grep -q "^$var=" .env; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        log_warning "Variáveis PostgreSQL ausentes: ${missing_vars[*]}"
        
        # Adicionar variáveis faltantes
        for var in "${missing_vars[@]}"; do
            case $var in
                "DB_HOST")
                    echo "DB_HOST=postgres" >> .env
                    ;;
                "DB_PORT")
                    echo "DB_PORT=5432" >> .env
                    ;;
                "DB_NAME")
                    echo "DB_NAME=nowhats" >> .env
                    ;;
                "DB_USER")
                    echo "DB_USER=postgres" >> .env
                    ;;
                "DB_PASSWORD")
                    local db_pass=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
                    echo "DB_PASSWORD=$db_pass" >> .env
                    ;;
            esac
        done
        
        log_success "Variáveis PostgreSQL adicionadas"
    else
        log_success "Configurações PostgreSQL OK"
    fi
}

# Função para limpar volumes PostgreSQL
clean_postgres_volumes() {
    log_info "Limpando volumes PostgreSQL..."
    
    # Listar volumes relacionados ao PostgreSQL
    local postgres_volumes=$(docker volume ls --filter "name=postgres" -q 2>/dev/null || true)
    
    if [[ -n "$postgres_volumes" ]]; then
        log_warning "Removendo volumes PostgreSQL antigos..."
        echo "$postgres_volumes" | xargs -r docker volume rm -f
        log_success "Volumes PostgreSQL removidos"
    else
        log_info "Nenhum volume PostgreSQL para remover"
    fi
}

# Função para iniciar PostgreSQL com verificação de saúde
start_postgres() {
    log_info "Iniciando PostgreSQL..."
    
    # Iniciar apenas o PostgreSQL
    docker-compose -f "$COMPOSE_FILE" up -d postgres
    
    # Aguardar inicialização
    log_info "Aguardando PostgreSQL inicializar..."
    local attempts=0
    local max_attempts=60  # 2 minutos
    
    while [[ $attempts -lt $max_attempts ]]; do
        local status=$(docker-compose -f "$COMPOSE_FILE" ps postgres --format "{{.Status}}" 2>/dev/null || echo "not found")
        
        if [[ "$status" == *"healthy"* ]]; then
            log_success "PostgreSQL está saudável!"
            return 0
        elif [[ "$status" == *"unhealthy"* ]] || [[ "$status" == *"exited"* ]]; then
            log_error "PostgreSQL falhou ao iniciar"
            log_info "Logs do PostgreSQL:"
            docker-compose -f "$COMPOSE_FILE" logs postgres | tail -20
            return 1
        elif [[ "$status" == *"starting"* ]] || [[ "$status" == *"running"* ]]; then
            echo -n "."
        fi
        
        sleep 2
        ((attempts++))
    done
    
    log_error "Timeout aguardando PostgreSQL (2 minutos)"
    log_info "Status atual:"
    docker-compose -f "$COMPOSE_FILE" ps postgres
    return 1
}

# Função para testar conexão PostgreSQL
test_postgres_connection() {
    log_info "Testando conexão PostgreSQL..."
    
    # Obter credenciais do .env
    local db_user=$(grep "^DB_USER=" .env | cut -d'=' -f2)
    local db_pass=$(grep "^DB_PASSWORD=" .env | cut -d'=' -f2)
    local db_name=$(grep "^DB_NAME=" .env | cut -d'=' -f2)
    
    # Testar conexão
    if docker exec nowhats_postgres psql -U "$db_user" -d "$db_name" -c "SELECT version();" >/dev/null 2>&1; then
        log_success "Conexão PostgreSQL OK"
        return 0
    else
        log_warning "Falha na conexão PostgreSQL"
        return 1
    fi
}

# EXECUTAR CORREÇÃO POSTGRESQL
echo "🔧 INICIANDO CORREÇÃO POSTGRESQL"
echo ""

# 1. Parar PostgreSQL
stop_postgres
echo ""

# 2. Limpar volumes
clean_postgres_volumes
echo ""

# 3. Corrigir permissões
fix_postgres_permissions
echo ""

# 4. Verificar .env
fix_env_postgres
echo ""

# 5. Iniciar PostgreSQL
if start_postgres; then
    echo ""
    
    # 6. Testar conexão
    if test_postgres_connection; then
        log_success "✅ PostgreSQL corrigido e funcionando!"
        echo ""
        log_info "Agora você pode iniciar os demais containers:"
        echo "  docker-compose -f $COMPOSE_FILE up -d"
    else
        log_warning "PostgreSQL iniciou mas conexão falhou"
        log_info "Verifique as credenciais no arquivo .env"
    fi
else
    echo ""
    log_error "❌ Falha ao corrigir PostgreSQL"
    echo ""
    log_info "Para diagnóstico detalhado:"
    echo "  docker-compose -f $COMPOSE_FILE logs postgres"
    echo "  bash diagnose-containers.sh"
fi

echo ""
log_info "Script concluído."