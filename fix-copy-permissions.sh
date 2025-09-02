#!/bin/bash

# Script para corrigir problemas de cópia de arquivos
# Use este script se você teve erro de permissão ao copiar arquivos para /opt/nowhats

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

log "Iniciando correção de cópia de arquivos do NoWhats..."

# Verificar se o diretório do projeto existe
PROJECT_DIR="/opt/nowhats"
if [[ ! -d "$PROJECT_DIR" ]]; then
    log "Criando diretório do projeto..."
    sudo mkdir -p $PROJECT_DIR
    sudo chown $USER:$USER $PROJECT_DIR
else
    log "Diretório do projeto já existe"
    # Garantir que o usuário tem permissão
    sudo chown -R $USER:$USER $PROJECT_DIR
fi

# Limpar arquivos problemáticos se existirem
log "Limpando arquivos problemáticos..."
if [[ -d "$PROJECT_DIR/.git" ]]; then
    warn "Removendo pasta .git problemática..."
    rm -rf "$PROJECT_DIR/.git"
fi

# Limpar outros arquivos desnecessários
rm -rf "$PROJECT_DIR/node_modules" 2>/dev/null || true
rm -rf "$PROJECT_DIR/sessions" 2>/dev/null || true
rm -rf "$PROJECT_DIR/uploads" 2>/dev/null || true
rm -f "$PROJECT_DIR"/*.log 2>/dev/null || true

# Instalar rsync se não estiver disponível
if ! command -v rsync &> /dev/null; then
    log "Instalando rsync..."
    sudo apt update
    sudo apt install -y rsync
fi

# Recopiar arquivos corretamente
log "Recopiando arquivos do projeto (excluindo .git e outros desnecessários)..."
if command -v rsync &> /dev/null; then
    rsync -av --exclude='.git' --exclude='node_modules' --exclude='*.log' --exclude='sessions' --exclude='uploads' . $PROJECT_DIR/
else
    # Fallback usando cp com exclusões manuais
    warn "Rsync não disponível, usando método alternativo..."
    
    # Copiar arquivos na raiz (exceto problemáticos)
    find . -maxdepth 1 -type f ! -name '*.log' -exec cp {} $PROJECT_DIR/ \;
    
    # Copiar diretórios importantes
    for dir in backend frontend docker nginx scripts supabase src; do
        if [[ -d "$dir" ]]; then
            log "Copiando diretório: $dir"
            cp -r "$dir" $PROJECT_DIR/
        fi
    done
    
    # Copiar arquivos de configuração importantes
    for file in docker-compose*.yml package.json *.md *.sh *.js *.ts *.json; do
        if [[ -f "$file" ]]; then
            cp "$file" $PROJECT_DIR/
        fi
    done
fi

# Verificar se a cópia foi bem-sucedida
log "Verificando arquivos copiados..."
if [[ -f "$PROJECT_DIR/docker-compose.prod.yml" || -f "$PROJECT_DIR/docker-compose.yml" ]]; then
    log "✅ Arquivos Docker Compose encontrados"
else
    warn "⚠️ Arquivos Docker Compose não encontrados"
fi

if [[ -d "$PROJECT_DIR/backend" ]]; then
    log "✅ Diretório backend encontrado"
else
    warn "⚠️ Diretório backend não encontrado"
fi

if [[ -d "$PROJECT_DIR/frontend" ]]; then
    log "✅ Diretório frontend encontrado"
else
    warn "⚠️ Diretório frontend não encontrado"
fi

# Definir permissões corretas
log "Definindo permissões corretas..."
sudo chown -R $USER:$USER $PROJECT_DIR
chmod +x $PROJECT_DIR/*.sh 2>/dev/null || true

log "Correção de cópia finalizada!"
echo
echo -e "${BLUE}Próximos passos:${NC}"
echo "1. Vá para o diretório: cd $PROJECT_DIR"
echo "2. Continue a instalação ou execute: ./install-simple.sh"
echo "3. Ou se já estava instalando, o processo deve continuar automaticamente"
echo
echo -e "${BLUE}Arquivos no diretório:${NC}"
ls -la $PROJECT_DIR/ | head -20