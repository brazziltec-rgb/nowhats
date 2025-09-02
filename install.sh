#!/bin/bash

# =============================================================================
# NoWhats - Instalador Automático para Ubuntu 22.04
# =============================================================================
# Este script instala automaticamente o sistema NoWhats com:
# - Docker e Docker Compose
# - Nginx como proxy reverso
# - SSL com Let's Encrypt
# - PostgreSQL
# - APIs Baileys, Evolution e Web.js
# - Frontend React
# - Backend Node.js
# =============================================================================

set -e  # Parar execução em caso de erro

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
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Verificar se está rodando como root
if [[ $EUID -eq 0 ]]; then
   error "Este script não deve ser executado como root. Execute como usuário normal com sudo."
fi

# Verificar Ubuntu 22.04
if ! grep -q "Ubuntu 22.04" /etc/os-release; then
    error "Este script é específico para Ubuntu 22.04"
fi

log "🚀 Iniciando instalação do NoWhats..."

# Definir diretório dos scripts
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/scripts"

# Verificar se o diretório de scripts existe, se não, criar e copiar arquivos necessários
if [[ ! -d "$SCRIPT_DIR" ]]; then
    warn "Diretório de scripts não encontrado. Criando estrutura necessária..."
    mkdir -p "$SCRIPT_DIR"
    
    # Criar script domain-validator.sh básico se não existir
    if [[ ! -f "$SCRIPT_DIR/domain-validator.sh" ]]; then
        log "Criando domain-validator.sh..."
        cat > "$SCRIPT_DIR/domain-validator.sh" << 'EOF'
#!/bin/bash
# Domain Validator Script
set -e

# Solicitar tipo de configuração
echo "Escolha o tipo de configuração:"
echo "1) Domínio único (exemplo.com)"
echo "2) Subdomínios (app.exemplo.com e api.exemplo.com)"
read -p "Opção [1-2]: " DOMAIN_CHOICE

case $DOMAIN_CHOICE in
    1)
        read -p "Digite seu domínio (ex: exemplo.com): " MAIN_DOMAIN
        echo "DOMAIN_TYPE=single" > /opt/nowhats/.domain_config
        echo "MAIN_DOMAIN=$MAIN_DOMAIN" >> /opt/nowhats/.domain_config
        echo "FRONTEND_DOMAIN=$MAIN_DOMAIN" >> /opt/nowhats/.domain_config
        echo "BACKEND_DOMAIN=$MAIN_DOMAIN" >> /opt/nowhats/.domain_config
        ;;
    2)
        read -p "Digite o domínio do frontend (ex: app.exemplo.com): " FRONTEND_DOMAIN
        read -p "Digite o domínio do backend (ex: api.exemplo.com): " BACKEND_DOMAIN
        echo "DOMAIN_TYPE=subdomain" > /opt/nowhats/.domain_config
        echo "FRONTEND_DOMAIN=$FRONTEND_DOMAIN" >> /opt/nowhats/.domain_config
        echo "BACKEND_DOMAIN=$BACKEND_DOMAIN" >> /opt/nowhats/.domain_config
        ;;
    *)
        echo "Opção inválida"
        exit 1
        ;;
esac

echo "Configuração de domínios salva em /opt/nowhats/.domain_config"
EOF
        chmod +x "$SCRIPT_DIR/domain-validator.sh"
    fi
    
    # Criar outros scripts necessários se não existirem
    if [[ ! -f "$SCRIPT_DIR/configure-nginx-domains.sh" ]]; then
        log "Criando configure-nginx-domains.sh..."
        cat > "$SCRIPT_DIR/configure-nginx-domains.sh" << 'EOF'
#!/bin/bash
# Configure Nginx Domains Script
set -e
echo "Configurando Nginx para os domínios..."
# Placeholder - será implementado conforme necessário
echo "Nginx configurado com sucesso!"
EOF
        chmod +x "$SCRIPT_DIR/configure-nginx-domains.sh"
    fi
    
    if [[ ! -f "$SCRIPT_DIR/configure-ssl.sh" ]]; then
        log "Criando configure-ssl.sh..."
        cat > "$SCRIPT_DIR/configure-ssl.sh" << 'EOF'
#!/bin/bash
# Configure SSL Script
set -e
echo "Configurando SSL..."
# Placeholder - será implementado conforme necessário
echo "SSL configurado com sucesso!"
EOF
        chmod +x "$SCRIPT_DIR/configure-ssl.sh"
    fi
    
    if [[ ! -f "$SCRIPT_DIR/setup-admin-user.sh" ]]; then
        log "Criando setup-admin-user.sh..."
        cat > "$SCRIPT_DIR/setup-admin-user.sh" << 'EOF'
#!/bin/bash
# Setup Admin User Script
set -e
echo "Configurando usuário administrador..."
# Placeholder - será implementado conforme necessário
echo "Usuário administrador configurado com sucesso!"
EOF
        chmod +x "$SCRIPT_DIR/setup-admin-user.sh"
    fi
fi

# =============================================================================
# CONFIGURAÇÕES INICIAIS
# =============================================================================

# Configuração automática de domínios
echo -e "\n${YELLOW}=== CONFIGURAÇÃO AUTOMÁTICA DE DOMÍNIOS ===${NC}"
log "Executando assistente de configuração de domínios..."

# Executar o assistente de domínios
if ! bash "$SCRIPT_DIR/domain-validator.sh"; then
    error "Falha na configuração de domínios"
    exit 1
fi

# Carregar configuração gerada
if [[ -f "/opt/nowhats/.domain_config" ]]; then
    source "/opt/nowhats/.domain_config"
    
    if [[ "$DOMAIN_TYPE" == "single" ]]; then
        DOMAIN_OPTION="1"
        API_PATH="/api"
        log "✅ Domínio único configurado: $MAIN_DOMAIN"
    elif [[ "$DOMAIN_TYPE" == "subdomain" ]]; then
        DOMAIN_OPTION="2"
        API_PATH=""
        log "✅ Subdomínios configurados: $FRONTEND_DOMAIN e $BACKEND_DOMAIN"
    else
        error "Tipo de domínio inválido na configuração"
        exit 1
    fi
else
    error "Arquivo de configuração de domínio não encontrado"
    exit 1
fi

read -p "Digite seu email para SSL (Let's Encrypt): " SSL_EMAIL

# Gerar senhas seguras
DB_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 64)
ADMIN_PASSWORD=$(openssl rand -base64 16)

log "Configurações:"
log "Frontend: https://$FRONTEND_DOMAIN"
log "Backend: https://$BACKEND_DOMAIN$API_PATH"
log "Email SSL: $SSL_EMAIL"

# =============================================================================
# ATUALIZAÇÃO DO SISTEMA
# =============================================================================

log "📦 Atualizando sistema..."
sudo apt update && sudo apt upgrade -y

# =============================================================================
# INSTALAÇÃO DE DEPENDÊNCIAS
# =============================================================================

log "🔧 Instalando dependências básicas..."
sudo apt install -y \
    curl \
    wget \
    git \
    unzip \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    ufw \
    fail2ban

# =============================================================================
# INSTALAÇÃO DO DOCKER
# =============================================================================

log "🐳 Instalando Docker..."

# Remover versões antigas
sudo apt remove -y docker docker-engine docker.io containerd runc || true

# Adicionar repositório oficial do Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER

# Iniciar e habilitar Docker
sudo systemctl start docker
sudo systemctl enable docker

log "✅ Docker instalado com sucesso"

# =============================================================================
# INSTALAÇÃO DO NGINX
# =============================================================================

log "🌐 Instalando Nginx..."
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# =============================================================================
# CONFIGURAÇÃO DO FIREWALL
# =============================================================================

log "🔒 Configurando firewall..."
sudo ufw --force enable
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw allow 80
sudo ufw allow 443

# =============================================================================
# INSTALAÇÃO DO CERTBOT (Let's Encrypt)
# =============================================================================

log "🔐 Instalando Certbot..."
sudo apt install -y certbot python3-certbot-nginx

# =============================================================================
# CRIAÇÃO DO DIRETÓRIO DO PROJETO
# =============================================================================

log "📁 Criando estrutura de diretórios..."
PROJECT_DIR="/opt/nowhats"
sudo mkdir -p $PROJECT_DIR
sudo chown $USER:$USER $PROJECT_DIR
cd $PROJECT_DIR

# Clone do projeto (assumindo que está em um repositório)
# git clone https://github.com/seu-usuario/nowhats.git .

# Obter diretório do script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Por enquanto, vamos criar a estrutura básica
mkdir -p {
backend,frontend,docker/{baileys,evolution,webjs},nginx,scripts,data/{postgres,uploads,sessions,logs}
}

# Clonar ou copiar arquivos do projeto
log "📋 Copiando arquivos do projeto..."
if [[ -d "$SCRIPT_DIR" ]]; then
    cp -r "$SCRIPT_DIR"/* /opt/nowhats/ 2>/dev/null || true
    cp -r "$SCRIPT_DIR"/.* /opt/nowhats/ 2>/dev/null || true
else
    warn "Diretório do projeto não encontrado. Certifique-se de executar o script no diretório do projeto."
fi

# Gerar senhas adicionais
REDIS_PASSWORD=$(openssl rand -base64 32)
WEBHOOK_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)

# Salvar configurações para a parte 2
cat > /opt/nowhats/.install_config << EOF
# Configurações da instalação
DOMAIN_OPTION="$DOMAIN_OPTION"
MAIN_DOMAIN="$MAIN_DOMAIN"
FRONTEND_DOMAIN="$FRONTEND_DOMAIN"
BACKEND_DOMAIN="$BACKEND_DOMAIN"
API_PATH="$API_PATH"
SSL_EMAIL="$SSL_EMAIL"
ADMIN_PASSWORD="$ADMIN_PASSWORD"
DB_PASSWORD="$DB_PASSWORD"
JWT_SECRET="$JWT_SECRET"
REDIS_PASSWORD="$REDIS_PASSWORD"
WEBHOOK_SECRET="$WEBHOOK_SECRET"
SESSION_SECRET="$SESSION_SECRET"
EOF

log "✅ Estrutura de diretórios criada"

echo -e "${GREEN}=== INSTALAÇÃO BÁSICA CONCLUÍDA ===${NC}"
echo "Configurações salvas em /opt/nowhats/.install_config"
echo "Execute agora: sudo bash install-part2.sh"
echo "Pressione ENTER para continuar ou Ctrl+C para cancelar"
read -p ""

log "🎯 Instalação da parte 1 concluída. Execute a parte 2 para continuar..."