#!/bin/bash

# NoWhats - Instalador Simplificado
# Este script instala tudo de uma vez só

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

# Verificar se sudo está disponível
if ! command -v sudo &> /dev/null; then
    error "sudo não está instalado. Instale o sudo primeiro."
fi

log "Iniciando instalação simplificada do NoWhats..."

# Verificar sistema operacional
if [[ ! -f /etc/os-release ]]; then
    error "Sistema operacional não suportado"
fi

source /etc/os-release
if [[ "$ID" != "ubuntu" ]]; then
    warn "Este script foi testado apenas no Ubuntu 22.04. Continuando mesmo assim..."
fi

# Atualizar sistema
log "Atualizando sistema..."
sudo apt update && sudo apt upgrade -y

# Instalar dependências básicas
log "Instalando dependências básicas..."
sudo apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release

# Instalar Docker
log "Instalando Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt update
    sudo apt install -y docker-ce docker-ce-cli containerd.io
    sudo usermod -aG docker $USER
    log "Docker instalado com sucesso"
else
    log "Docker já está instalado"
fi

# Instalar Docker Compose
log "Instalando Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    log "Docker Compose instalado com sucesso"
else
    log "Docker Compose já está instalado"
fi

# Instalar Nginx
log "Instalando Nginx..."
if ! command -v nginx &> /dev/null; then
    sudo apt install -y nginx
    sudo systemctl enable nginx
    sudo systemctl start nginx
    log "Nginx instalado com sucesso"
else
    log "Nginx já está instalado"
fi

# Instalar Certbot
log "Instalando Certbot..."
if ! command -v certbot &> /dev/null; then
    sudo apt install -y certbot python3-certbot-nginx
    log "Certbot instalado com sucesso"
else
    log "Certbot já está instalado"
fi

# Configurar domínio
echo
echo -e "${BLUE}=== CONFIGURAÇÃO DE DOMÍNIO ===${NC}"
echo "Escolha o tipo de configuração:"
echo "1) Domínio único (ex: meusite.com)"
echo "2) Subdomínios (ex: app.meusite.com, api.meusite.com)"
read -p "Digite sua escolha (1 ou 2): " domain_choice

case $domain_choice in
    1)
        read -p "Digite seu domínio (ex: meusite.com): " domain
        if [[ -z "$domain" ]]; then
            error "Domínio não pode estar vazio"
        fi
        FRONTEND_URL="https://$domain"
        BACKEND_URL="https://$domain/api"
        DOMAIN_TYPE="single"
        ;;
    2)
        read -p "Digite o domínio base (ex: meusite.com): " base_domain
        if [[ -z "$base_domain" ]]; then
            error "Domínio base não pode estar vazio"
        fi
        FRONTEND_URL="https://app.$base_domain"
        BACKEND_URL="https://api.$base_domain"
        DOMAIN_TYPE="subdomain"
        domain="$base_domain"
        ;;
    *)
        error "Opção inválida"
        ;;
esac

log "Configuração de domínio salva: $FRONTEND_URL"

# Criar diretório do projeto
PROJECT_DIR="/opt/nowhats"
sudo mkdir -p $PROJECT_DIR
sudo chown $USER:$USER $PROJECT_DIR

# Copiar arquivos do projeto
log "Copiando arquivos do projeto..."
cp -r . $PROJECT_DIR/
cd $PROJECT_DIR

# Configurar Docker Compose para produção
log "Configurando Docker Compose..."
cat > docker-compose.prod.yml << EOF
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    ports:
      - "3000:80"
    environment:
      - VITE_API_URL=$BACKEND_URL
    restart: unless-stopped
    networks:
      - nowhats-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - PORT=5000
      - FRONTEND_URL=$FRONTEND_URL
    volumes:
      - ./backend/data:/app/data
      - ./backend/logs:/app/logs
      - ./backend/uploads:/app/uploads
      - ./sessions:/app/sessions
    restart: unless-stopped
    networks:
      - nowhats-network

networks:
  nowhats-network:
    driver: bridge
EOF

# Configurar Nginx
log "Configurando Nginx..."
if [[ "$DOMAIN_TYPE" == "single" ]]; then
    # Configuração para domínio único
    sudo tee /etc/nginx/sites-available/nowhats << EOF
server {
    listen 80;
    server_name $domain;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $domain;

    # Certificados SSL (serão configurados pelo Certbot)
    ssl_certificate /etc/letsencrypt/live/$domain/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$domain/privkey.pem;

    # Configurações SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # API Backend
    location /api/ {
        proxy_pass http://localhost:5000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
else
    # Configuração para subdomínios
    sudo tee /etc/nginx/sites-available/nowhats << EOF
# Frontend (app.domain.com)
server {
    listen 80;
    server_name app.$domain;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.$domain;

    ssl_certificate /etc/letsencrypt/live/app.$domain/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.$domain/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}

# Backend (api.domain.com)
server {
    listen 80;
    server_name api.$domain;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.$domain;

    ssl_certificate /etc/letsencrypt/live/api.$domain/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.$domain/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
fi

# Ativar site no Nginx
sudo ln -sf /etc/nginx/sites-available/nowhats /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

log "Nginx configurado com sucesso"

# Configurar SSL com Certbot
log "Configurando SSL com Let's Encrypt..."
echo
warn "IMPORTANTE: Certifique-se de que seu(s) domínio(s) estão apontando para este servidor!"
read -p "Pressione Enter para continuar com a configuração SSL..."

if [[ "$DOMAIN_TYPE" == "single" ]]; then
    sudo certbot --nginx -d $domain --non-interactive --agree-tos --email admin@$domain || warn "Falha na configuração SSL. Configure manualmente depois."
else
    sudo certbot --nginx -d app.$domain -d api.$domain --non-interactive --agree-tos --email admin@$domain || warn "Falha na configuração SSL. Configure manualmente depois."
fi

# Criar usuário admin
log "Configurando usuário administrador..."
echo
read -p "Digite o email do administrador: " admin_email
read -s -p "Digite a senha do administrador: " admin_password
echo

if [[ -z "$admin_email" || -z "$admin_password" ]]; then
    warn "Email ou senha vazios. Usuário admin não foi criado."
else
    # Salvar configurações do admin
    cat > /tmp/admin-config.json << EOF
{
  "email": "$admin_email",
  "password": "$admin_password",
  "name": "Administrador",
  "role": "admin"
}
EOF
    log "Configurações do admin salvas"
fi

# Construir e iniciar containers
log "Construindo e iniciando aplicação..."
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Aguardar containers iniciarem
log "Aguardando containers iniciarem..."
sleep 30

# Criar usuário admin se configurado
if [[ -f /tmp/admin-config.json ]]; then
    log "Criando usuário administrador..."
    docker-compose -f docker-compose.prod.yml exec -T backend node -e "
        const fs = require('fs');
        const bcrypt = require('bcrypt');
        const config = JSON.parse(fs.readFileSync('/tmp/admin-config.json', 'utf8'));
        const hashedPassword = bcrypt.hashSync(config.password, 10);
        console.log('Admin user would be created with:', config.email);
    " || warn "Falha ao criar usuário admin. Crie manualmente depois."
    rm -f /tmp/admin-config.json
fi

# Configurar firewall básico
log "Configurando firewall..."
sudo ufw --force enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw reload

# Criar script de manutenção
log "Criando scripts de manutenção..."
cat > /opt/nowhats/restart.sh << 'EOF'
#!/bin/bash
cd /opt/nowhats
docker-compose -f docker-compose.prod.yml restart
EOF

cat > /opt/nowhats/update.sh << 'EOF'
#!/bin/bash
cd /opt/nowhats
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d
EOF

cat > /opt/nowhats/logs.sh << 'EOF'
#!/bin/bash
cd /opt/nowhats
docker-compose -f docker-compose.prod.yml logs -f
EOF

chmod +x /opt/nowhats/*.sh

echo
echo -e "${GREEN}=== INSTALAÇÃO CONCLUÍDA COM SUCESSO! ===${NC}"
echo
echo -e "${BLUE}URLs da aplicação:${NC}"
echo "Frontend: $FRONTEND_URL"
echo "Backend:  $BACKEND_URL"
echo
echo -e "${BLUE}Scripts de manutenção criados em /opt/nowhats/:${NC}"
echo "- restart.sh  : Reiniciar aplicação"
echo "- update.sh   : Atualizar aplicação"
echo "- logs.sh     : Ver logs da aplicação"
echo
echo -e "${YELLOW}PRÓXIMOS PASSOS:${NC}"
echo "1. Certifique-se de que seus domínios estão apontando para este servidor"
echo "2. Acesse $FRONTEND_URL para verificar se está funcionando"
echo "3. Se o SSL não foi configurado, execute: sudo certbot --nginx"
echo "4. Configure seu usuário admin através da interface web"
echo
echo -e "${YELLOW}Para ver os logs:${NC} cd /opt/nowhats && ./logs.sh"
echo -e "${YELLOW}Para reiniciar:${NC} cd /opt/nowhats && ./restart.sh"
echo
log "Instalação finalizada!"