#!/bin/bash

# Script para corrigir problemas de permissão do arquivo .env
# Versão: 1.0
# Data: $(date +%Y-%m-%d)

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funções de log
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

echo "==========================================="
echo "🔧 CORREÇÃO DE PERMISSÕES DO ARQUIVO .ENV"
echo "==========================================="
echo

# Verificar se estamos no diretório correto
if [ ! -f "docker-compose.yml" ]; then
    log_error "Arquivo docker-compose.yml não encontrado!"
    log_info "Execute este script no diretório raiz do projeto NoWhats"
    exit 1
fi

log_info "Verificando permissões do diretório atual..."
ls -la . | head -5

# Verificar se o arquivo .env existe
if [ -f ".env" ]; then
    log_warning "Arquivo .env existe, verificando permissões..."
    ls -la .env
    
    # Tentar corrigir permissões
    log_info "Corrigindo permissões do arquivo .env..."
    chmod 644 .env 2>/dev/null || {
        log_warning "Não foi possível alterar permissões com chmod, tentando com sudo..."
        sudo chmod 644 .env 2>/dev/null || {
            log_error "Falha ao corrigir permissões do .env"
        }
    }
    
    # Verificar se conseguimos escrever no arquivo
    if [ -w ".env" ]; then
        log_success "Arquivo .env tem permissões corretas"
    else
        log_warning "Arquivo .env ainda sem permissão de escrita"
        log_info "Tentando remover e recriar o arquivo..."
        rm -f .env 2>/dev/null || sudo rm -f .env 2>/dev/null || {
            log_error "Não foi possível remover o arquivo .env"
            exit 1
        }
    fi
fi

# Se o arquivo não existe ou foi removido, criar novo
if [ ! -f ".env" ]; then
    log_info "Criando novo arquivo .env..."
    
    # Verificar se .env.example existe
    if [ -f ".env.example" ]; then
        log_info "Copiando de .env.example..."
        cp .env.example .env || {
            log_warning "Falha ao copiar .env.example, criando arquivo básico..."
        }
    fi
    
    # Se ainda não existe, criar arquivo básico
    if [ ! -f ".env" ]; then
        log_info "Criando arquivo .env básico..."
        
        # Gerar senhas aleatórias
        DB_PASS=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25 2>/dev/null || echo "nowhats_db_$(date +%s)")
        JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-50 2>/dev/null || echo "nowhats_jwt_$(date +%s)_super_secure")
        REDIS_PASS=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25 2>/dev/null || echo "nowhats_redis_$(date +%s)")
        
        # Criar arquivo .env
        cat > .env << EOF
# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_NAME=nowhats
DB_USER=nowhats
DB_PASSWORD=${DB_PASS}

# JWT Configuration
JWT_SECRET=${JWT_SECRET}

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASS}

# API URLs
BAILEYS_API_URL=http://baileys:3003
EVOLUTION_API_URL=http://evolution:8080
WEBJS_API_URL=http://webjs:3006

# Frontend Configuration
REACT_APP_API_URL=http://localhost:3001

# Environment
NODE_ENV=development
PORT=3001
EOF
        
        if [ $? -eq 0 ]; then
            log_success "Arquivo .env criado com sucesso!"
        else
            log_error "Falha ao criar arquivo .env"
            exit 1
        fi
    fi
    
    # Definir permissões corretas
    chmod 644 .env 2>/dev/null || {
        log_warning "Não foi possível definir permissões com chmod"
    }
fi

# Verificar se o arquivo foi criado corretamente
if [ -f ".env" ] && [ -r ".env" ]; then
    log_success "Arquivo .env está funcionando corretamente!"
    log_info "Conteúdo do arquivo .env:"
    echo "----------------------------------------"
    # Mostrar conteúdo mascarando senhas
    sed 's/PASSWORD=.*/PASSWORD=***HIDDEN***/g; s/SECRET=.*/SECRET=***HIDDEN***/g' .env
    echo "----------------------------------------"
else
    log_error "Problema persistente com o arquivo .env"
    exit 1
fi

log_info "Verificando permissões finais..."
ls -la .env

echo
log_success "✨ Correção de permissões concluída!"
log_info "Agora você pode executar: docker-compose up -d"
echo