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
    warn "Corrigindo Dockerfile.prod do frontend..."
    sed -i 's/npm ci --only=production/npm ci/g' frontend/Dockerfile.prod
    sed -i 's/# Instalar dependências/# Instalar dependências (incluindo devDependencies para o build)/g' frontend/Dockerfile.prod
    log "Dockerfile.prod do frontend corrigido"
else
    log "Dockerfile.prod do frontend já está correto"
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

log "Correção de build finalizada!"
echo
echo -e "${BLUE}Status dos containers:${NC}"
docker-compose -f docker-compose.prod.yml ps
echo
echo -e "${BLUE}Para ver logs completos:${NC} cd /opt/nowhats && ./logs.sh"
echo -e "${BLUE}Para reiniciar:${NC} cd /opt/nowhats && ./restart.sh"
echo
echo -e "${GREEN}Se tudo estiver funcionando, acesse sua aplicação pelo domínio configurado!${NC}"