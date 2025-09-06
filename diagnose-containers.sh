#!/bin/bash

# NoWhats - Diagnóstico Detalhado de Containers
# Identifica exatamente qual container está falhando e por quê

set -e

echo "🔍 NoWhats - Diagnóstico de Containers"
echo "====================================="
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

# Função para verificar container específico
check_container() {
    local container_name=$1
    local service_name=$2
    
    echo ""
    log_info "Verificando $service_name ($container_name)..."
    
    # Verificar se container existe
    if ! docker ps -a --format "table {{.Names}}" | grep -q "$container_name"; then
        log_warning "Container $container_name não encontrado"
        return 1
    fi
    
    # Verificar status
    local status=$(docker inspect --format='{{.State.Status}}' "$container_name" 2>/dev/null || echo "not_found")
    local health=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null || echo "no_health")
    
    case $status in
        "running")
            if [[ "$health" == "healthy" ]]; then
                log_success "$service_name está rodando e saudável"
            elif [[ "$health" == "starting" ]]; then
                log_warning "$service_name está iniciando (aguarde...)"
            elif [[ "$health" == "unhealthy" ]]; then
                log_error "$service_name está rodando mas não saudável"
                echo "📋 Logs do healthcheck:"
                docker inspect --format='{{range .State.Health.Log}}{{.Output}}{{end}}' "$container_name" | tail -5
            else
                log_success "$service_name está rodando (sem healthcheck)"
            fi
            ;;
        "exited")
            local exit_code=$(docker inspect --format='{{.State.ExitCode}}' "$container_name")
            log_error "$service_name parou (código: $exit_code)"
            echo "📋 Últimas 10 linhas do log:"
            docker logs "$container_name" --tail=10 2>&1 | sed 's/^/   /'
            ;;
        "created")
            log_warning "$service_name foi criado mas não iniciado"
            ;;
        "restarting")
            log_warning "$service_name está reiniciando"
            ;;
        *)
            log_error "$service_name em estado desconhecido: $status"
            ;;
    esac
}

# Função para verificar dependências
check_dependencies() {
    log_info "Verificando dependências do sistema..."
    
    # Docker
    if command -v docker &> /dev/null; then
        local docker_version=$(docker --version)
        log_success "Docker: $docker_version"
    else
        log_error "Docker não instalado"
        return 1
    fi
    
    # Docker Compose
    if command -v docker-compose &> /dev/null; then
        local compose_version=$(docker-compose --version)
        log_success "Docker Compose: $compose_version"
    elif docker compose version &> /dev/null; then
        local compose_version=$(docker compose version)
        log_success "Docker Compose Plugin: $compose_version"
    else
        log_error "Docker Compose não instalado"
        return 1
    fi
    
    # Serviço Docker
    if systemctl is-active --quiet docker; then
        log_success "Serviço Docker está rodando"
    else
        log_error "Serviço Docker não está rodando"
        return 1
    fi
    
    # Acesso ao Docker
    if docker ps &>/dev/null; then
        log_success "Acesso ao Docker funcionando"
    else
        log_error "Sem acesso ao Docker (problema de permissão)"
        return 1
    fi
}

# Função para verificar recursos
check_resources() {
    log_info "Verificando recursos do sistema..."
    
    # Espaço em disco
    local disk_usage=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')
    if [[ $disk_usage -gt 90 ]]; then
        log_error "Pouco espaço em disco: ${disk_usage}% usado"
    elif [[ $disk_usage -gt 80 ]]; then
        log_warning "Espaço em disco baixo: ${disk_usage}% usado"
    else
        log_success "Espaço em disco OK: ${disk_usage}% usado"
    fi
    
    # Memória
    local mem_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2 }')
    if [[ $mem_usage -gt 90 ]]; then
        log_error "Pouca memória disponível: ${mem_usage}% usado"
    elif [[ $mem_usage -gt 80 ]]; then
        log_warning "Memória baixa: ${mem_usage}% usado"
    else
        log_success "Memória OK: ${mem_usage}% usado"
    fi
}

# Função para verificar portas
check_ports() {
    log_info "Verificando portas em uso..."
    
    local ports=("3000" "3001" "3003" "3006" "5432" "6379" "8080")
    
    for port in "${ports[@]}"; do
        if netstat -tuln 2>/dev/null | grep -q ":$port "; then
            local process=$(netstat -tulnp 2>/dev/null | grep ":$port " | awk '{print $7}' | head -1)
            log_success "Porta $port em uso por: $process"
        else
            log_warning "Porta $port não está em uso"
        fi
    done
}

# Função para verificar arquivos
check_files() {
    log_info "Verificando arquivos necessários..."
    
    # .env
    if [[ -f ".env" ]]; then
        log_success "Arquivo .env existe"
        
        # Verificar variáveis críticas
        local critical_vars=("DB_PASSWORD" "JWT_SECRET" "REDIS_PASSWORD")
        for var in "${critical_vars[@]}"; do
            if grep -q "^$var=" .env; then
                log_success "Variável $var definida"
            else
                log_error "Variável $var não definida no .env"
            fi
        done
    else
        log_error "Arquivo .env não existe"
    fi
    
    # Diretórios
    local dirs=("data/postgres" "data/redis" "data/sessions" "data/logs")
    for dir in "${dirs[@]}"; do
        if [[ -d "$dir" ]]; then
            log_success "Diretório $dir existe"
        else
            log_warning "Diretório $dir não existe"
        fi
    done
}

# EXECUTAR DIAGNÓSTICOS
echo "🔍 INICIANDO DIAGNÓSTICO COMPLETO"
echo ""

# 1. Dependências
check_dependencies
echo ""

# 2. Recursos
check_resources
echo ""

# 3. Arquivos
check_files
echo ""

# 4. Portas
check_ports
echo ""

# 5. Containers individuais
log_info "Verificando containers individuais..."
check_container "nowhats_postgres" "PostgreSQL"
check_container "nowhats_redis" "Redis"
check_container "nowhats_backend" "Backend"
check_container "nowhats_frontend" "Frontend"
check_container "nowhats_baileys" "Baileys API"
check_container "nowhats_evolution" "Evolution API"
check_container "nowhats_webjs" "WebJS API"

echo ""
log_info "Status geral dos containers:"
docker-compose -f "$COMPOSE_FILE" ps 2>/dev/null || docker ps -a --filter "name=nowhats"

echo ""
log_info "Uso de recursos Docker:"
docker system df 2>/dev/null || echo "Comando não disponível"

echo ""
echo "🔧 SUGESTÕES DE CORREÇÃO:"
echo ""
echo "1. Se containers estão parando:"
echo "   docker-compose -f $COMPOSE_FILE logs [nome_do_container]"
echo ""
echo "2. Se há problemas de permissão:"
echo "   sudo chmod 666 /var/run/docker.sock"
echo "   newgrp docker"
echo ""
echo "3. Se há problemas de memória:"
echo "   docker system prune -f"
echo "   docker-compose -f $COMPOSE_FILE down"
echo "   docker-compose -f $COMPOSE_FILE up -d"
echo ""
echo "4. Se PostgreSQL não inicia:"
echo "   sudo rm -rf data/postgres/*"
echo "   docker-compose -f $COMPOSE_FILE up -d postgres"
echo ""
echo "5. Para reiniciar tudo:"
echo "   docker-compose -f $COMPOSE_FILE down"
echo "   docker system prune -f"
echo "   docker-compose -f $COMPOSE_FILE up -d"

echo ""
log_info "Diagnóstico concluído!"