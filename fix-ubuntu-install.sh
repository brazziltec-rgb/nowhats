#!/bin/bash

# NoWhats - Diagnóstico e Correção de Instalação Ubuntu
# Este script identifica e corrige problemas comuns na instalação

set -e

echo "🔍 NoWhats - Diagnóstico Ubuntu"
echo "================================"
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log colorido
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# Detectar se precisa de sudo
SUDO_CMD=""
if [[ $EUID -ne 0 ]]; then
    SUDO_CMD="sudo"
    log_info "Executando como usuário normal (usando sudo quando necessário)"
else
    log_info "Executando como root"
fi

# 1. VERIFICAR SISTEMA
log_info "1. Verificando sistema Ubuntu..."
if ! command -v lsb_release &> /dev/null; then
    log_warning "lsb_release não encontrado, instalando..."
    $SUDO_CMD apt update -y
    $SUDO_CMD apt install -y lsb-release
fi

UBUNTU_VERSION=$(lsb_release -rs)
log_success "Ubuntu $UBUNTU_VERSION detectado"

# 2. VERIFICAR E INSTALAR DOCKER
log_info "2. Verificando Docker..."
if ! command -v docker &> /dev/null; then
    log_warning "Docker não encontrado, instalando..."
    
    # Remover versões antigas
    $SUDO_CMD apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true
    
    # Instalar dependências
    $SUDO_CMD apt update -y
    $SUDO_CMD apt install -y \
        ca-certificates \
        curl \
        gnupg \
        lsb-release
    
    # Adicionar chave GPG oficial do Docker
    $SUDO_CMD mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | $SUDO_CMD gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    
    # Adicionar repositório
    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
        $(lsb_release -cs) stable" | $SUDO_CMD tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Instalar Docker
    $SUDO_CMD apt update -y
    $SUDO_CMD apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    log_success "Docker instalado"
else
    DOCKER_VERSION=$(docker --version)
    log_success "Docker já instalado: $DOCKER_VERSION"
fi

# 3. VERIFICAR E CONFIGURAR PERMISSÕES
log_info "3. Configurando permissões do Docker..."
if ! groups $USER | grep -q docker; then
    log_warning "Usuário $USER não está no grupo docker, adicionando..."
    $SUDO_CMD usermod -aG docker $USER
    log_success "Usuário adicionado ao grupo docker"
else
    log_success "Usuário já está no grupo docker"
fi

# 4. VERIFICAR SERVIÇO DOCKER
log_info "4. Verificando serviço Docker..."
if ! $SUDO_CMD systemctl is-active --quiet docker; then
    log_warning "Docker não está rodando, iniciando..."
    $SUDO_CMD systemctl enable docker
    $SUDO_CMD systemctl start docker
    sleep 3
fi

if $SUDO_CMD systemctl is-active --quiet docker; then
    log_success "Serviço Docker está rodando"
else
    log_error "Falha ao iniciar serviço Docker"
    exit 1
fi

# 5. TESTAR ACESSO AO DOCKER
log_info "5. Testando acesso ao Docker..."
if docker ps &>/dev/null; then
    log_success "Acesso ao Docker funcionando"
elif $SUDO_CMD docker ps &>/dev/null; then
    log_warning "Docker funciona apenas com sudo"
    log_info "Aplicando correção de permissões..."
    
    # Tentar aplicar permissões imediatamente
    if command -v newgrp &> /dev/null; then
        log_info "Executando newgrp docker para aplicar permissões..."
        # Executar o resto do script com as novas permissões
        exec newgrp docker << EOFNEWGRP
#!/bin/bash
echo "Testando Docker após newgrp..."
if docker ps &>/dev/null; then
    echo "✅ Docker funcionando sem sudo"
else
    echo "⚠️  Ainda precisa de sudo para Docker"
fi
EOFNEWGRP
    fi
else
    log_error "Docker não está funcionando"
    log_info "Tentando diagnóstico..."
    
    # Verificar se o socket existe
    if [[ ! -S /var/run/docker.sock ]]; then
        log_error "Socket do Docker não encontrado"
        exit 1
    fi
    
    # Verificar permissões do socket
    SOCKET_PERMS=$(ls -la /var/run/docker.sock)
    log_info "Permissões do socket: $SOCKET_PERMS"
    
    exit 1
fi

# 6. VERIFICAR DOCKER COMPOSE
log_info "6. Verificando Docker Compose..."
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    log_warning "Docker Compose não encontrado, instalando..."
    
    # Tentar instalar via apt (versão mais nova)
    if $SUDO_CMD apt install -y docker-compose-plugin; then
        log_success "Docker Compose Plugin instalado"
    else
        # Fallback para instalação manual
        COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d'"' -f4)
        $SUDO_CMD curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        $SUDO_CMD chmod +x /usr/local/bin/docker-compose
        log_success "Docker Compose instalado manualmente"
    fi
else
    if command -v docker-compose &> /dev/null; then
        COMPOSE_VERSION=$(docker-compose --version)
        log_success "Docker Compose disponível: $COMPOSE_VERSION"
    else
        COMPOSE_VERSION=$(docker compose version)
        log_success "Docker Compose Plugin disponível: $COMPOSE_VERSION"
    fi
fi

# 7. VERIFICAR ARQUIVOS DO PROJETO
log_info "7. Verificando arquivos do projeto..."
if [[ ! -f "docker-compose.prod.yml" ]] && [[ ! -f "docker-compose.yml" ]]; then
    log_error "Nenhum arquivo docker-compose encontrado"
    exit 1
fi

COMPOSE_FILE="docker-compose.prod.yml"
if [[ ! -f "$COMPOSE_FILE" ]]; then
    COMPOSE_FILE="docker-compose.yml"
fi
log_success "Usando arquivo: $COMPOSE_FILE"

# 8. VERIFICAR/CRIAR .env
log_info "8. Verificando arquivo .env..."
if [[ ! -f ".env" ]]; then
    log_warning "Arquivo .env não encontrado, criando..."
    
    if [[ -f ".env.example" ]]; then
        cp .env.example .env
        log_success "Arquivo .env criado a partir do .env.example"
    else
        log_warning "Criando .env básico..."
        cat > .env << 'EOF'
# Configuração NoWhats
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
JWT_SECRET=jwt-secret-$(date +%s)
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:3000

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=redis123
EOF
        log_success "Arquivo .env básico criado"
    fi
else
    log_success "Arquivo .env já existe"
fi

# 9. CRIAR DIRETÓRIOS
log_info "9. Criando diretórios necessários..."
mkdir -p data/{postgres,redis,sessions/{baileys,evolution,webjs},logs,uploads}
log_success "Diretórios criados"

# 10. TESTAR DOCKER COMPOSE
log_info "10. Testando Docker Compose..."
if docker-compose -f "$COMPOSE_FILE" config &>/dev/null; then
    log_success "Arquivo Docker Compose válido"
elif docker compose -f "$COMPOSE_FILE" config &>/dev/null; then
    log_success "Arquivo Docker Compose válido (plugin)"
    # Usar plugin se disponível
    alias docker-compose='docker compose'
else
    log_error "Arquivo Docker Compose inválido"
    exit 1
fi

# 11. PARAR CONTAINERS EXISTENTES
log_info "11. Parando containers existentes..."
docker-compose -f "$COMPOSE_FILE" down 2>/dev/null || true
log_success "Containers parados"

# 12. INICIAR CONTAINERS
log_info "12. Iniciando containers..."
if docker-compose -f "$COMPOSE_FILE" up -d; then
    log_success "Containers iniciados"
else
    log_error "Falha ao iniciar containers"
    log_info "Verificando logs..."
    docker-compose -f "$COMPOSE_FILE" logs
    exit 1
fi

# 13. AGUARDAR INICIALIZAÇÃO
log_info "13. Aguardando inicialização dos containers..."
sleep 30

# 14. VERIFICAR STATUS
log_info "14. Verificando status dos containers..."
docker-compose -f "$COMPOSE_FILE" ps

echo ""
log_success "=== INSTALAÇÃO CONCLUÍDA ==="
echo ""
log_info "URLs de acesso:"
echo "  🌐 Frontend: http://localhost:3000"
echo "  🔧 Backend:  http://localhost:3006"
echo "  📊 Evolution: http://localhost:8080"
echo "  🤖 Baileys:  http://localhost:3001"
echo "  🕷️  WebJS:    http://localhost:3003"
echo ""
log_info "Comandos úteis:"
echo "  📋 Ver logs: docker-compose -f $COMPOSE_FILE logs"
echo "  🔄 Reiniciar: docker-compose -f $COMPOSE_FILE restart"
echo "  ⏹️  Parar: docker-compose -f $COMPOSE_FILE down"
echo ""

if ! docker ps | grep -q "nowhats"; then
    log_warning "ATENÇÃO: Alguns containers podem não estar rodando"
    log_info "Execute: docker-compose -f $COMPOSE_FILE logs"
    log_info "Para ver os logs e identificar problemas"
fi

echo "💡 Se ainda houver problemas de permissão:"
echo "   1. Faça logout e login novamente"
echo "   2. Ou execute: newgrp docker"
echo "   3. Ou reinicie o sistema"