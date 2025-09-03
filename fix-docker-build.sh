#!/bin/bash

# Script para corrigir problemas de build do Docker
# Use este script se você teve erro de npm ci no build do frontend

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[AVISO] $1${NC}"
}

error() {
    echo -e "${RED}[ERRO] $1${NC}"
    exit 1
}

# Verificar se está rodando como root
if [[ $EUID -eq 0 ]]; then
   error "Este script NÃO deve ser executado como root. Execute como usuário normal."
fi

log "Iniciando correção de build do Docker..."

# Verificar se o projeto existe
if [[ ! -d "/opt/nowhats" ]]; then
    error "Projeto NoWhats não encontrado em /opt/nowhats. Execute o instalador principal primeiro."
fi

cd /opt/nowhats

# Parar containers existentes
log "Parando containers existentes..."
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true

# Limpar imagens e cache do Docker
log "Limpando cache do Docker..."
docker system prune -f
docker builder prune -f

# Remover imagens antigas se existirem
log "Removendo imagens antigas..."
docker rmi nowhats-frontend:latest 2>/dev/null || true
docker rmi nowhats-backend:latest 2>/dev/null || true
docker rmi $(docker images -f "dangling=true" -q) 2>/dev/null || true

# Verificar se o Dockerfile.prod do frontend foi corrigido
log "Verificando Dockerfile.prod do frontend..."
if grep -q "npm ci --only=production" frontend/Dockerfile.prod; then
    warn "Corrigindo npm ci --only=production para npm ci..."
    sed -i 's/npm ci --only=production/npm ci/g' frontend/Dockerfile.prod
    sed -i 's/# Instalar dependências/# Instalar dependências (incluindo devDependencies para o build)/g' frontend/Dockerfile.prod
    log "Dockerfile.prod do frontend corrigido (--only=production removido)"
elif grep -q "npm ci" frontend/Dockerfile.prod && [ ! -f "frontend/package-lock.json" ]; then
    warn "Corrigindo npm ci para npm install (package-lock.json ausente)..."
    sed -i 's/npm ci/npm install/g' frontend/Dockerfile.prod
    log "Dockerfile.prod do frontend corrigido (npm ci → npm install)"
else
    log "✓ Dockerfile.prod do frontend já está correto"
fi

# Corrigir Dockerfile.prod do backend se necessário
log "Verificando Dockerfile.prod do backend..."
if grep -q "npm ci" backend/Dockerfile.prod && [ ! -f "backend/package-lock.json" ]; then
    warn "Corrigindo npm ci para npm install no backend (package-lock.json ausente)..."
    sed -i 's/npm ci/npm install/g' backend/Dockerfile.prod
    log "✓ Dockerfile.prod do backend corrigido (npm ci → npm install)"
else
    log "✓ Dockerfile.prod do backend já está correto"
fi

# Verificar se git está instalado no Dockerfile do backend
log "Verificando instalação do git no backend..."
if ! grep -q "git" backend/Dockerfile.prod; then
    warn "Adicionando git às dependências do backend..."
    sed -i '/RUN apk add --no-cache \\/a\    git \\' backend/Dockerfile.prod
    log "✓ Git adicionado ao Dockerfile.prod do backend"
else
    log "✓ Git já está presente no Dockerfile.prod do backend"
fi

# Verificar conflitos de dependências peer no frontend
log "Verificando conflitos de dependências peer no frontend..."
if grep -q "npm install" frontend/Dockerfile.prod && ! grep -q "--legacy-peer-deps" frontend/Dockerfile.prod; then
    warn "Adicionando --legacy-peer-deps para resolver conflitos de dependências..."
    sed -i 's/npm install/npm install --legacy-peer-deps/g' frontend/Dockerfile.prod
    log "✓ Flag --legacy-peer-deps adicionada ao Dockerfile.prod do frontend"
else
    log "✓ Dockerfile.prod do frontend já está configurado para conflitos de dependências"
fi

# Verificar se os arquivos package.json existem
log "Verificando arquivos de dependências..."
if [[ ! -f "frontend/package.json" ]]; then
    error "Arquivo frontend/package.json não encontrado"
fi

if [[ ! -f "backend/package.json" ]]; then
    error "Arquivo backend/package.json não encontrado"
fi

# Limpar node_modules se existirem
log "Limpando node_modules antigos..."
rm -rf frontend/node_modules 2>/dev/null || true
rm -rf backend/node_modules 2>/dev/null || true

# Verificar se o docker-compose.prod.yml existe
if [[ ! -f "docker-compose.prod.yml" ]]; then
    error "Arquivo docker-compose.prod.yml não encontrado. Execute o instalador principal primeiro."
fi

# Construir imagens do zero
log "Construindo imagens Docker do zero..."
echo "Isso pode levar alguns minutos..."

# Build do backend primeiro (geralmente mais rápido)
log "Construindo backend..."
if docker-compose -f docker-compose.prod.yml build --no-cache backend; then
    log "✅ Backend construído com sucesso"
else
    error "❌ Falha ao construir backend"
fi

# Build do frontend
log "Construindo frontend..."
if docker-compose -f docker-compose.prod.yml build --no-cache frontend; then
    log "✅ Frontend construído com sucesso"
else
    error "❌ Falha ao construir frontend"
fi

# Iniciar containers
log "Iniciando containers..."
if docker-compose -f docker-compose.prod.yml up -d; then
    log "✅ Containers iniciados com sucesso"
else
    error "❌ Falha ao iniciar containers"
fi

# Aguardar containers iniciarem
log "Aguardando containers iniciarem..."
sleep 30

# Verificar status dos containers
log "Verificando status dos containers..."
docker-compose -f docker-compose.prod.yml ps

# Verificar logs para possíveis erros
log "Verificando logs dos containers..."
echo -e "${BLUE}Logs do Frontend:${NC}"
docker-compose -f docker-compose.prod.yml logs --tail=10 frontend

echo -e "${BLUE}Logs do Backend:${NC}"
docker-compose -f docker-compose.prod.yml logs --tail=10 backend

# Corrigir configuração do server.js para PostgreSQL
log "Verificando configuração do server.js..."
if [ -f "backend/server.js" ]; then
    # Corrigir logs SQLite para PostgreSQL
    if grep -q "SQLite" backend/server.js; then
        log "Corrigindo configuração do banco de dados no server.js..."
        sed -i 's/SQLite/PostgreSQL/g' backend/server.js
        sed -i 's/migrate-sqlite.js/migrate.js/g' backend/server.js
        sed -i 's/closeDb()/closePool()/g' backend/server.js
        log "Configuração do server.js corrigida"
    fi
fi

# Remover atributo version obsoleto do docker-compose.prod.yml
log "Verificando docker-compose.prod.yml..."
if [ -f "docker-compose.prod.yml" ]; then
    if grep -q "version:" docker-compose.prod.yml; then
        log "Removendo atributo version obsoleto..."
        sed -i '/^version:/d' docker-compose.prod.yml
        sed -i '/^$/N;/^\n$/d' docker-compose.prod.yml  # Remove linhas vazias extras
        log "Atributo version removido"
    fi
    
    # Adicionar configuração DNS no backend se não existir
    if ! grep -q "dns:" docker-compose.prod.yml; then
        # Encontrar a linha do backend e adicionar DNS após restart
        sed -i '/container_name: nowhats_backend/,/restart: unless-stopped/ {
            /restart: unless-stopped/a\
        dns:\
          - 8.8.8.8\
          - 8.8.4.4
        }' docker-compose.prod.yml
        log "✅ Configuração DNS adicionada ao backend"
    else
        log "ℹ️  Configuração DNS já existe no backend"
    fi
fi

# Verificar e criar arquivo .env com variáveis necessárias
log "Verificando arquivo .env..."
if [ ! -f ".env" ] || ! grep -q "DB_PASSWORD" .env; then
    log "Criando/atualizando arquivo .env com variáveis necessárias..."
    
    # Preservar variáveis existentes do Supabase se existirem
    SUPABASE_URL=""
    SUPABASE_KEY=""
    if [ -f ".env" ]; then
        SUPABASE_URL=$(grep "VITE_SUPABASE_URL" .env 2>/dev/null || echo "")
        SUPABASE_KEY=$(grep "VITE_SUPABASE_ANON_KEY" .env 2>/dev/null || echo "")
    fi
    
    # Criar novo arquivo .env
    cat > .env << 'EOF'
# =============================================================================
# CONFIGURAÇÕES GERAIS
# =============================================================================
NODE_ENV=production
PORT=3006
FRONTEND_PORT=3000

# =============================================================================
# BANCO DE DADOS POSTGRESQL
# =============================================================================
DB_HOST=postgres
DB_PORT=5432
DB_NAME=atendezap
DB_USER=postgres
DB_PASSWORD=postgres123
DATABASE_URL=postgresql://postgres:postgres123@postgres:5432/atendezap

# =============================================================================
# AUTENTICAÇÃO JWT
# =============================================================================
JWT_SECRET=nowhats_jwt_secret_key_2025_production
JWT_EXPIRES_IN=7d

# =============================================================================
# CORS E FRONTEND
# =============================================================================
FRONTEND_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000

# =============================================================================
# APIS WHATSAPP
# =============================================================================
BAILEYS_API_URL=http://baileys-api:3001
EVOLUTION_API_URL=http://evolution-api:8080
WEBJS_API_URL=http://webjs-api:3003

# =============================================================================
# SUPABASE (OPCIONAL)
# =============================================================================
EOF
    
    # Adicionar variáveis do Supabase se existirem
    if [ -n "$SUPABASE_URL" ]; then
        echo "$SUPABASE_URL" >> .env
    fi
    if [ -n "$SUPABASE_KEY" ]; then
        echo "$SUPABASE_KEY" >> .env
    fi
    
    log "Arquivo .env criado/atualizado com sucesso"
fi

log "Correção de build finalizada!"
echo
echo -e "${BLUE}Status dos containers:${NC}"
docker-compose -f docker-compose.prod.yml ps
echo
echo -e "${BLUE}Para ver logs completos:${NC} cd /opt/nowhats && ./logs.sh"
echo -e "${BLUE}Para reiniciar:${NC} cd /opt/nowhats && ./restart.sh"
echo
echo -e "${GREEN}Se tudo estiver funcionando, acesse sua aplicação pelo domínio configurado!${NC}"