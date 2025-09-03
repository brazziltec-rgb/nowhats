#!/bin/bash

# =============================================================================
# NoWhats - Instalador Ultra Simplificado
# Funciona para qualquer usuário - detecta automaticamente as permissões
# =============================================================================

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[INFO] $1${NC}"; }
warn() { echo -e "${YELLOW}[AVISO] $1${NC}"; }
error() { echo -e "${RED}[ERRO] $1${NC}"; exit 1; }

# Função para executar comandos com sudo se necessário
run_cmd() {
    if [[ $EUID -eq 0 ]]; then
        "$@"
    else
        sudo "$@"
    fi
}

# Função para executar comandos como usuário normal
run_user_cmd() {
    if [[ $EUID -eq 0 ]]; then
        # Se estamos como root, executar como o usuário que chamou sudo
        if [[ -n "$SUDO_USER" ]]; then
            sudo -u "$SUDO_USER" "$@"
        else
            warn "Executando como root. Recomendamos executar como usuário normal."
            "$@"
        fi
    else
        "$@"
    fi
}

log "🚀 NoWhats - Instalador Ultra Simplificado"
log "Detectando permissões e configurando automaticamente..."

# Verificar sistema
if ! grep -q "Ubuntu" /etc/os-release 2>/dev/null; then
    warn "Sistema não é Ubuntu. Continuando mesmo assim..."
fi

# Atualizar sistema
log "📦 Atualizando sistema..."
run_cmd apt update -y
run_cmd apt upgrade -y

# Instalar dependências
log "🔧 Instalando dependências..."
run_cmd apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release

# Instalar Docker
log "🐳 Instalando Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    
    # Adicionar usuário ao grupo docker
    if [[ $EUID -eq 0 ]] && [[ -n "$SUDO_USER" ]]; then
        usermod -aG docker "$SUDO_USER"
        log "Usuário $SUDO_USER adicionado ao grupo docker"
    elif [[ $EUID -ne 0 ]]; then
        run_cmd usermod -aG docker "$USER"
        log "Usuário $USER adicionado ao grupo docker"
    fi
else
    log "Docker já instalado"
fi

# Instalar Docker Compose
log "🔨 Instalando Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    run_cmd curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    run_cmd chmod +x /usr/local/bin/docker-compose
else
    log "Docker Compose já instalado"
fi

# Configurar .env se não existir
log "⚙️ Configurando ambiente..."
if [[ ! -f ".env" ]]; then
    if [[ -f ".env.example" ]]; then
        cp .env.example .env
        log "Arquivo .env criado a partir do .env.example"
        
        # Gerar senhas automáticas
        DB_PASS=$(openssl rand -base64 16 2>/dev/null | tr -d "=+/" | cut -c1-16 || echo "nowhats$(date +%s)")
        JWT_SECRET=$(openssl rand -base64 32 2>/dev/null | tr -d "=+/" || echo "jwt-secret-$(date +%s)")
        REDIS_PASS=$(openssl rand -base64 16 2>/dev/null | tr -d "=+/" | cut -c1-16 || echo "redis$(date +%s)")
        
        # Substituir no .env
        sed -i "s/sua_senha_super_segura_aqui/$DB_PASS/g" .env 2>/dev/null || true
        sed -i "s/sua_chave_jwt_super_secreta_aqui/$JWT_SECRET/g" .env 2>/dev/null || true
        sed -i "s/ALTERE_ESTA_SENHA_REDIS/$REDIS_PASS/g" .env 2>/dev/null || true
        
        log "Senhas geradas automaticamente no .env"
    else
        warn "Arquivo .env.example não encontrado. Criando .env básico..."
        cat > .env << 'EOF'
# Configuração Básica NoWhats
NODE_ENV=production
PORT=3006
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3006

# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=nowhats
DB_USER=nowhats
DB_PASSWORD=nowhats123

# JWT
JWT_SECRET=minha-chave-secreta-jwt-2024
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:3000

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=redis123

# APIs WhatsApp
BAILEYS_PORT=3001
EVOLUTION_PORT=3002
WEBJS_PORT=3003

# Baileys
BAILEYS_API_KEY=baileys-api-key-2024

# Evolution
EVOLUTION_API_KEY=evolution-api-key-2024
EVOLUTION_AUTHENTICATION_TYPE=apikey
EVOLUTION_AUTHENTICATION_API_KEY=evolution-global-key-2024
EVOLUTION_AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES=true

# Web.js
WEBJS_API_KEY=webjs-api-key-2024
EOF
        log "Arquivo .env básico criado"
    fi
else
    log "Arquivo .env já existe"
fi

# Criar diretórios necessários
log "📁 Criando diretórios..."
mkdir -p data/{postgres,redis,sessions/{baileys,evolution,webjs},logs/{baileys,evolution,webjs},uploads}

# Ajustar permissões
log "🔐 Ajustando permissões..."
if [[ $EUID -eq 0 ]] && [[ -n "$SUDO_USER" ]]; then
    chown -R "$SUDO_USER:$SUDO_USER" .
fi

# Dar permissões aos scripts
chmod +x *.sh 2>/dev/null || true
chmod +x scripts/*.sh 2>/dev/null || true

# Iniciar serviços Docker
log "🚀 Iniciando Docker..."
run_cmd systemctl enable docker
run_cmd systemctl start docker

# Aguardar Docker inicializar
sleep 3

# Construir e iniciar containers
log "🏗️ Construindo e iniciando aplicação..."
if [[ -f "docker-compose.prod.yml" ]]; then
    run_user_cmd docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
    run_user_cmd docker-compose -f docker-compose.prod.yml build
    run_user_cmd docker-compose -f docker-compose.prod.yml up -d
else
    run_user_cmd docker-compose down 2>/dev/null || true
    run_user_cmd docker-compose build
    run_user_cmd docker-compose up -d
fi

# Aguardar containers iniciarem
log "⏳ Aguardando containers iniciarem..."
sleep 15

# Verificar status
log "📊 Verificando status dos containers..."
run_user_cmd docker ps

log "✅ Instalação concluída!"
log ""
log "🌐 Acesse a aplicação:"
log "   Frontend: http://localhost:3000"
log "   Backend:  http://localhost:3006"
log ""
log "📋 Comandos úteis:"
log "   Ver logs:    docker-compose logs -f"
log "   Parar:       docker-compose down"
log "   Reiniciar:   docker-compose restart"
log ""
log "🔧 Arquivo .env foi configurado automaticamente com senhas seguras."
log "📝 Para produção, edite o .env com seus domínios e configurações."

# Mostrar informações importantes
if [[ $EUID -ne 0 ]] && groups "$USER" | grep -q docker; then
    warn "IMPORTANTE: Faça logout e login novamente para aplicar as permissões do Docker."
    warn "Ou execute: newgrp docker"
fi

log "🎉 NoWhats instalado com sucesso!"