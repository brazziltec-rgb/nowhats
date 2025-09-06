#!/bin/bash

# NoWhats - Correção Automática para Ubuntu
# Resolve problemas comuns de instalação e inicialização

set -e

echo "🔧 NoWhats - Correção Automática Ubuntu"
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

# Verificar se está rodando como root
if [[ $EUID -eq 0 ]]; then
   log_error "Este script não deve ser executado como root"
   log_info "Execute: bash fix-nowhats-ubuntu.sh"
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

# Função para parar containers
stop_containers() {
    log_info "Parando containers existentes..."
    
    if docker-compose -f "$COMPOSE_FILE" ps -q 2>/dev/null | grep -q .; then
        docker-compose -f "$COMPOSE_FILE" down --remove-orphans 2>/dev/null || true
        log_success "Containers parados"
    else
        log_info "Nenhum container rodando"
    fi
    
    # Parar containers órfãos
    local orphan_containers=$(docker ps -a --filter "name=nowhats" --format "{{.Names}}" 2>/dev/null || true)
    if [[ -n "$orphan_containers" ]]; then
        log_info "Removendo containers órfãos..."
        echo "$orphan_containers" | xargs -r docker rm -f
        log_success "Containers órfãos removidos"
    fi
}

# Função para limpar recursos Docker
clean_docker() {
    log_info "Limpando recursos Docker..."
    
    # Remover volumes órfãos
    docker volume prune -f &>/dev/null || true
    
    # Remover redes órfãs
    docker network prune -f &>/dev/null || true
    
    # Remover imagens não utilizadas
    docker image prune -f &>/dev/null || true
    
    log_success "Recursos Docker limpos"
}

# Função para verificar e corrigir permissões Docker
fix_docker_permissions() {
    log_info "Verificando permissões Docker..."
    
    # Verificar se usuário está no grupo docker
    if ! groups | grep -q docker; then
        log_warning "Usuário não está no grupo docker"
        log_info "Adicionando usuário ao grupo docker..."
        sudo usermod -aG docker "$USER"
        log_success "Usuário adicionado ao grupo docker"
        log_warning "IMPORTANTE: Faça logout/login ou execute: newgrp docker"
    else
        log_success "Usuário já está no grupo docker"
    fi
    
    # Verificar socket Docker
    if [[ ! -w /var/run/docker.sock ]]; then
        log_warning "Sem permissão de escrita no socket Docker"
        log_info "Corrigindo permissões..."
        sudo chmod 666 /var/run/docker.sock
        log_success "Permissões do socket corrigidas"
    else
        log_success "Permissões do socket OK"
    fi
}

# Função para verificar e iniciar serviço Docker
fix_docker_service() {
    log_info "Verificando serviço Docker..."
    
    if ! systemctl is-active --quiet docker; then
        log_warning "Serviço Docker não está rodando"
        log_info "Iniciando serviço Docker..."
        sudo systemctl enable docker
        sudo systemctl start docker
        sleep 3
        
        if systemctl is-active --quiet docker; then
            log_success "Serviço Docker iniciado"
        else
            log_error "Falha ao iniciar serviço Docker"
            return 1
        fi
    else
        log_success "Serviço Docker rodando"
    fi
}

# Função para criar/verificar arquivo .env
fix_env_file() {
    log_info "Verificando arquivo .env..."
    
    if [[ ! -f ".env" ]]; then
        log_warning "Arquivo .env não existe"
        
        if [[ -f ".env.example" ]]; then
            log_info "Criando .env a partir do .env.example..."
            cp .env.example .env
            
            # Gerar senhas aleatórias
            local db_pass=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
            local jwt_secret=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-50)
            local redis_pass=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
            
            # Substituir valores no .env
            sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=$db_pass/" .env
            sed -i "s/JWT_SECRET=.*/JWT_SECRET=$jwt_secret/" .env
            sed -i "s/REDIS_PASSWORD=.*/REDIS_PASSWORD=$redis_pass/" .env
            
            log_success "Arquivo .env criado com senhas geradas"
        else
            log_info "Criando .env básico..."
            cat > .env << 'EOF'
# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=nowhats
DB_USER=nowhats
DB_PASSWORD=nowhats_db_2024

# JWT
JWT_SECRET=nowhats_jwt_secret_2024_super_secure

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=nowhats_redis_2024

# API URLs
BAILEYS_API_URL=http://baileys:3003
EVOLUTION_API_URL=http://evolution:8080
WEBJS_API_URL=http://webjs:3006

# Frontend
REACT_APP_API_URL=http://localhost:3001
EOF
            log_success "Arquivo .env básico criado"
        fi
    else
        log_success "Arquivo .env existe"
        
        # Verificar variáveis críticas
        local missing_vars=()
        local critical_vars=("DB_PASSWORD" "JWT_SECRET" "REDIS_PASSWORD")
        
        for var in "${critical_vars[@]}"; do
            if ! grep -q "^$var=" .env; then
                missing_vars+=("$var")
            fi
        done
        
        if [[ ${#missing_vars[@]} -gt 0 ]]; then
            log_warning "Variáveis faltando no .env: ${missing_vars[*]}"
            log_info "Adicionando variáveis faltando..."
            
            for var in "${missing_vars[@]}"; do
                case $var in
                    "DB_PASSWORD")
                        echo "DB_PASSWORD=nowhats_db_2024" >> .env
                        ;;
                    "JWT_SECRET")
                        echo "JWT_SECRET=nowhats_jwt_secret_2024_super_secure" >> .env
                        ;;
                    "REDIS_PASSWORD")
                        echo "REDIS_PASSWORD=nowhats_redis_2024" >> .env
                        ;;
                esac
            done
            
            log_success "Variáveis adicionadas ao .env"
        fi
    fi
}

# Função para criar diretórios necessários
create_directories() {
    log_info "Criando diretórios necessários..."
    
    local dirs=(
        "data/postgres"
        "data/redis"
        "data/sessions"
        "data/logs"
        "data/uploads"
    )
    
    for dir in "${dirs[@]}"; do
        if [[ ! -d "$dir" ]]; then
            mkdir -p "$dir"
            log_success "Diretório $dir criado"
        fi
    done
    
    # Corrigir permissões
    chmod -R 755 data/ 2>/dev/null || true
    log_success "Permissões dos diretórios corrigidas"
}

# Função para verificar portas em conflito
check_port_conflicts() {
    log_info "Verificando conflitos de porta..."
    
    local ports=("3000" "3001" "3003" "3006" "5432" "6379" "8080")
    local conflicts=()
    
    for port in "${ports[@]}"; do
        if netstat -tuln 2>/dev/null | grep -q ":$port "; then
            local process=$(netstat -tulnp 2>/dev/null | grep ":$port " | awk '{print $7}' | head -1)
            if [[ "$process" != *"docker"* ]]; then
                conflicts+=("$port")
            fi
        fi
    done
    
    if [[ ${#conflicts[@]} -gt 0 ]]; then
        log_warning "Portas em conflito: ${conflicts[*]}"
        log_info "Considere parar os processos ou alterar as portas no docker-compose"
    else
        log_success "Nenhum conflito de porta detectado"
    fi
}

# Função para iniciar containers
start_containers() {
    log_info "Iniciando containers..."
    
    # Primeiro, iniciar apenas o PostgreSQL
    log_info "Iniciando PostgreSQL..."
    docker-compose -f "$COMPOSE_FILE" up -d postgres
    
    # Aguardar PostgreSQL ficar saudável
    log_info "Aguardando PostgreSQL ficar saudável..."
    local attempts=0
    while [[ $attempts -lt 30 ]]; do
        if docker-compose -f "$COMPOSE_FILE" ps postgres | grep -q "healthy"; then
            log_success "PostgreSQL está saudável"
            break
        fi
        
        if docker-compose -f "$COMPOSE_FILE" ps postgres | grep -q "unhealthy\|exited"; then
            log_error "PostgreSQL falhou ao iniciar"
            docker-compose -f "$COMPOSE_FILE" logs postgres
            return 1
        fi
        
        sleep 2
        ((attempts++))
    done
    
    if [[ $attempts -eq 30 ]]; then
        log_error "Timeout aguardando PostgreSQL"
        return 1
    fi
    
    # Iniciar Redis
    log_info "Iniciando Redis..."
    docker-compose -f "$COMPOSE_FILE" up -d redis
    sleep 5
    
    # Iniciar demais serviços
    log_info "Iniciando demais serviços..."
    docker-compose -f "$COMPOSE_FILE" up -d
    
    # Aguardar todos os serviços
    log_info "Aguardando todos os serviços..."
    sleep 20
    
    log_success "Containers iniciados"
}

# Função para verificar status final
check_final_status() {
    log_info "Verificando status final..."
    
    echo ""
    docker-compose -f "$COMPOSE_FILE" ps
    
    echo ""
    log_info "URLs de acesso:"
    echo "  Frontend: http://localhost:3000"
    echo "  Backend:  http://localhost:3001"
    echo "  Baileys:  http://localhost:3003"
    echo "  WebJS:    http://localhost:3006"
    echo "  Evolution: http://localhost:8080"
    
    # Verificar se frontend está respondendo
    if curl -s http://localhost:3000 >/dev/null 2>&1; then
        log_success "Frontend acessível em http://localhost:3000"
    else
        log_warning "Frontend pode não estar acessível ainda (aguarde alguns segundos)"
    fi
}

# EXECUTAR CORREÇÕES
echo "🔧 INICIANDO CORREÇÃO AUTOMÁTICA"
echo ""

# 1. Parar containers
stop_containers
echo ""

# 2. Corrigir permissões Docker
fix_docker_permissions
echo ""

# 3. Corrigir serviço Docker
fix_docker_service
echo ""

# 4. Limpar recursos
clean_docker
echo ""

# 5. Corrigir arquivo .env
fix_env_file
echo ""

# 6. Criar diretórios
create_directories
echo ""

# 7. Verificar conflitos de porta
check_port_conflicts
echo ""

# 8. Iniciar containers
if start_containers; then
    echo ""
    check_final_status
    echo ""
    log_success "✅ NoWhats corrigido e iniciado com sucesso!"
    echo ""
    log_info "Se ainda houver problemas, execute:"
    echo "  bash diagnose-containers.sh"
else
    echo ""
    log_error "❌ Falha ao iniciar containers"
    echo ""
    log_info "Para diagnóstico detalhado, execute:"
    echo "  bash diagnose-containers.sh"
    echo ""
    log_info "Para logs específicos:"
    echo "  docker-compose -f $COMPOSE_FILE logs [nome_do_container]"
fi