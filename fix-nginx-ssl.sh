#!/bin/bash

# Script para corrigir problemas de SSL no Nginx
# Use este script se você teve erro de certificados SSL durante a instalação

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

log "Iniciando correção de SSL do NoWhats..."

# Verificar se o projeto existe
if [[ ! -d "/opt/nowhats" ]]; then
    error "Projeto NoWhats não encontrado em /opt/nowhats. Execute o instalador principal primeiro."
fi

cd /opt/nowhats

# Verificar se os containers estão rodando
if ! docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    log "Iniciando containers..."
    docker-compose -f docker-compose.prod.yml up -d
    sleep 30
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
        DOMAIN_TYPE="single"
        ;;
    2)
        read -p "Digite o domínio base (ex: meusite.com): " base_domain
        if [[ -z "$base_domain" ]]; then
            error "Domínio base não pode estar vazio"
        fi
        DOMAIN_TYPE="subdomain"
        domain="$base_domain"
        ;;
    *)
        error "Opção inválida"
        ;;
esac

# Reconfigurar Nginx sem SSL primeiro
log "Reconfigurando Nginx temporariamente sem SSL..."
if [[ "$DOMAIN_TYPE" == "single" ]]; then
    # Configuração temporária para domínio único (apenas HTTP)
    sudo tee /etc/nginx/sites-available/nowhats << EOF
server {
    listen 80;
    server_name $domain;

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
    # Configuração temporária para subdomínios (apenas HTTP)
    sudo tee /etc/nginx/sites-available/nowhats << EOF
# Frontend (app.domain.com)
server {
    listen 80;
    server_name app.$domain;

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

# Testar e recarregar Nginx
sudo nginx -t
sudo systemctl reload nginx

log "Nginx reconfigurado com sucesso"

# Configurar SSL com Certbot
log "Configurando SSL com Let's Encrypt..."
echo
warn "IMPORTANTE: Certifique-se de que seu(s) domínio(s) estão apontando para este servidor!"
warn "A aplicação deve estar rodando para o Certbot validar o domínio."
echo "Testando acesso HTTP primeiro..."

if [[ "$DOMAIN_TYPE" == "single" ]]; then
    echo "Teste: curl -I http://$domain"
    curl -I "http://$domain" || warn "Não foi possível acessar http://$domain"
else
    echo "Teste: curl -I http://app.$domain"
    curl -I "http://app.$domain" || warn "Não foi possível acessar http://app.$domain"
    echo "Teste: curl -I http://api.$domain"
    curl -I "http://api.$domain" || warn "Não foi possível acessar http://api.$domain"
fi

echo
read -p "Pressione Enter para continuar com a configuração SSL..."

# Obter certificados SSL
if [[ "$DOMAIN_TYPE" == "single" ]]; then
    if sudo certbot --nginx -d $domain --non-interactive --agree-tos --email admin@$domain; then
        log "SSL configurado com sucesso para $domain"
        echo "Acesse: https://$domain"
    else
        warn "Falha na configuração SSL."
        echo "Tente manualmente: sudo certbot --nginx -d $domain"
        echo "Ou acesse temporariamente via HTTP: http://$domain"
    fi
else
    if sudo certbot --nginx -d app.$domain -d api.$domain --non-interactive --agree-tos --email admin@$domain; then
        log "SSL configurado com sucesso para app.$domain e api.$domain"
        echo "Acesse: https://app.$domain"
    else
        warn "Falha na configuração SSL."
        echo "Tente manualmente: sudo certbot --nginx -d app.$domain -d api.$domain"
        echo "Ou acesse temporariamente via HTTP: http://app.$domain"
    fi
fi

echo
log "Correção de SSL finalizada!"
echo
echo -e "${BLUE}Status dos containers:${NC}"
docker-compose -f docker-compose.prod.yml ps
echo
echo -e "${BLUE}Para ver logs:${NC} cd /opt/nowhats && ./logs.sh"
echo -e "${BLUE}Para reiniciar:${NC} cd /opt/nowhats && ./restart.sh"