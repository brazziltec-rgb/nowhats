#!/bin/bash

# Script para diagnosticar e resolver problemas de autenticação
# Autor: Sistema de Instalação Automática Nowhats
# Data: $(date '+%Y-%m-%d')

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] ⚠${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ✗${NC} $1"
}

# Verificar se está rodando como root
if [[ $EUID -eq 0 ]]; then
   log_error "Este script não deve ser executado como root"
   exit 1
fi

# Verificar se Docker está rodando
if ! docker info > /dev/null 2>&1; then
    log_error "Docker não está rodando. Inicie o Docker primeiro."
    exit 1
fi

# Função para diagnosticar problemas
diagnose_auth_issues() {
    log "🔍 Diagnosticando problemas de autenticação..."
    
    # Verificar se os containers estão rodando
    log "Verificando status dos containers..."
    if docker-compose ps | grep -q "Up"; then
        log_success "Containers estão rodando"
    else
        log_error "Alguns containers não estão rodando"
        docker-compose ps
    fi
    
    # Verificar logs do backend
    log "Verificando logs do backend (últimas 50 linhas)..."
    docker-compose logs --tail=50 backend
    
    # Verificar logs do Redis (se existir)
    if docker-compose ps | grep -q "redis"; then
        log "Verificando logs do Redis..."
        docker-compose logs --tail=20 redis
    fi
    
    # Verificar conectividade com banco de dados
    log "Testando conectividade com banco de dados..."
    if docker-compose exec -T backend node -e "console.log('DB connection test')"; then
        log_success "Backend está respondendo"
    else
        log_error "Backend não está respondendo corretamente"
    fi
}

# Função para limpar rate limiting
clear_rate_limiting() {
    log "🧹 Limpando rate limiting..."
    
    # Se estiver usando Redis para rate limiting
    if docker-compose ps | grep -q "redis"; then
        log "Limpando cache do Redis..."
        docker-compose exec -T redis redis-cli FLUSHALL
        log_success "Cache do Redis limpo"
    fi
    
    # Reiniciar o backend para limpar rate limiting em memória
    log "Reiniciando backend para limpar rate limiting em memória..."
    docker-compose restart backend
    
    # Aguardar o backend inicializar
    log "Aguardando backend inicializar..."
    sleep 10
    
    # Verificar se o backend está respondendo
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f http://localhost:3001/api/health > /dev/null 2>&1; then
            log_success "Backend está respondendo na tentativa $attempt"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            log_error "Backend não respondeu após $max_attempts tentativas"
            return 1
        fi
        
        log "Tentativa $attempt/$max_attempts - aguardando..."
        sleep 2
        ((attempt++))
    done
}

# Função para verificar variáveis de ambiente
check_environment() {
    log "🔧 Verificando variáveis de ambiente..."
    
    # Verificar se o arquivo .env existe
    if [ ! -f ".env" ]; then
        log_error "Arquivo .env não encontrado"
        return 1
    fi
    
    # Verificar variáveis críticas
    local required_vars=("JWT_SECRET" "JWT_REFRESH_SECRET" "DB_PASSWORD")
    
    for var in "${required_vars[@]}"; do
        if grep -q "^${var}=" .env; then
            local value=$(grep "^${var}=" .env | cut -d'=' -f2)
            if [ -n "$value" ] && [ "$value" != "your_secret_here" ]; then
                log_success "$var está configurado"
            else
                log_error "$var não está configurado corretamente"
            fi
        else
            log_error "$var não encontrado no .env"
        fi
    done
}

# Função para testar autenticação
test_authentication() {
    log "🧪 Testando autenticação..."
    
    # Testar endpoint de health
    if curl -s -f http://localhost:3001/api/health > /dev/null 2>&1; then
        log_success "API está respondendo"
    else
        log_error "API não está respondendo"
        return 1
    fi
    
    # Testar rate limiting (deve permitir algumas tentativas)
    log "Testando rate limiting..."
    local response=$(curl -s -w "%{http_code}" -o /dev/null http://localhost:3001/api/auth/login -X POST -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"test"}')
    
    if [ "$response" = "400" ] || [ "$response" = "401" ]; then
        log_success "Rate limiting está funcionando normalmente (HTTP $response)"
    elif [ "$response" = "429" ]; then
        log_warning "Rate limiting ainda está ativo (HTTP 429)"
        log "Aguarde 15 minutos ou execute a limpeza novamente"
    else
        log_warning "Resposta inesperada: HTTP $response"
    fi
}

# Função para mostrar informações úteis
show_useful_info() {
    log "📋 Informações úteis:"
    
    echo ""
    echo "🔗 URLs de acesso:"
    echo "   Frontend: http://localhost:3000"
    echo "   Backend API: http://localhost:3001/api"
    echo "   Health Check: http://localhost:3001/api/health"
    
    echo ""
    echo "📊 Status dos containers:"
    docker-compose ps
    
    echo ""
    echo "🛠️ Comandos úteis:"
    echo "   Ver logs do backend: docker-compose logs -f backend"
    echo "   Ver logs do frontend: docker-compose logs -f frontend"
    echo "   Reiniciar serviços: docker-compose restart"
    echo "   Parar tudo: docker-compose down"
    echo "   Iniciar tudo: docker-compose up -d"
    
    echo ""
    echo "🔧 Para problemas persistentes:"
    echo "   1. Verifique o arquivo .env"
    echo "   2. Verifique os logs: docker-compose logs"
    echo "   3. Reinicie os containers: docker-compose restart"
    echo "   4. Se necessário, recrie os containers: docker-compose down && docker-compose up -d"
}

# Função principal
main() {
    echo "="*60
    echo "🔧 DIAGNÓSTICO E CORREÇÃO DE PROBLEMAS DE AUTENTICAÇÃO"
    echo "="*60
    echo ""
    
    # Verificar se estamos no diretório correto
    if [ ! -f "docker-compose.yml" ]; then
        log_error "docker-compose.yml não encontrado. Execute este script no diretório raiz do projeto."
        exit 1
    fi
    
    # Menu de opções
    echo "Escolha uma opção:"
    echo "1) Diagnóstico completo"
    echo "2) Limpar rate limiting"
    echo "3) Verificar variáveis de ambiente"
    echo "4) Testar autenticação"
    echo "5) Mostrar informações úteis"
    echo "6) Executar tudo (diagnóstico + limpeza + teste)"
    echo "0) Sair"
    echo ""
    read -p "Digite sua escolha [0-6]: " choice
    
    case $choice in
        1)
            diagnose_auth_issues
            ;;
        2)
            clear_rate_limiting
            ;;
        3)
            check_environment
            ;;
        4)
            test_authentication
            ;;
        5)
            show_useful_info
            ;;
        6)
            diagnose_auth_issues
            echo ""
            check_environment
            echo ""
            clear_rate_limiting
            echo ""
            test_authentication
            echo ""
            show_useful_info
            ;;
        0)
            log "Saindo..."
            exit 0
            ;;
        *)
            log_error "Opção inválida"
            exit 1
            ;;
    esac
    
    echo ""
    log_success "Operação concluída!"
}

# Executar função principal
main "$@"