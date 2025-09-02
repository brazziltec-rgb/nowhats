#!/bin/bash

# =============================================================================
# NOWHATS - CONFIGURADOR AUTOMÁTICO DE NGINX COM DOMÍNIOS
# =============================================================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Diretórios
NGINX_SITES_AVAILABLE="/etc/nginx/sites-available"
NGINX_SITES_ENABLED="/etc/nginx/sites-enabled"
NOWHATS_CONFIG_DIR="/opt/nowhats"
DOMAIN_CONFIG_FILE="$NOWHATS_CONFIG_DIR/.domain_config"

# Função para log
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    return 1
}

# =============================================================================
# TEMPLATES DE CONFIGURAÇÃO NGINX
# =============================================================================

# Template para domínio único
generate_single_domain_config() {
    local domain="$1"
    local config_file="$NGINX_SITES_AVAILABLE/nowhats-$domain"
    
    log "Gerando configuração Nginx para domínio único: $domain"
    
    cat > "$config_file" << EOF
# Configuração Nginx para NoWhats - Domínio Único
# Domínio: $domain
# Gerado automaticamente em $(date)

# Redirecionamento HTTP para HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name $domain;
    
    # Redirecionamento para HTTPS
    return 301 https://\$server_name\$request_uri;
}

# Configuração HTTPS principal
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $domain;
    
    # Certificados SSL (serão configurados pelo Certbot)
    ssl_certificate /etc/letsencrypt/live/$domain/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$domain/privkey.pem;
    
    # Configurações SSL modernas
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-CHACHA20-POLY1305;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Headers de segurança
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Configuração de logs
    access_log /var/log/nginx/nowhats-access.log;
    error_log /var/log/nginx/nowhats-error.log;
    
    # Configuração de upload
    client_max_body_size 100M;
    
    # API Backend (rotas /api/*)
    location /api/ {
        proxy_pass http://127.0.0.1:3006;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # WebSocket para WhatsApp (rotas /ws/*)
    location /ws/ {
        proxy_pass http://127.0.0.1:3006;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Frontend (todas as outras rotas)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Fallback para SPA
        try_files \$uri \$uri/ /index.html;
    }
    
    # Arquivos estáticos com cache
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)\$ {
        proxy_pass http://127.0.0.1:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF
    
    log "✅ Configuração gerada: $config_file"
}

# Template para subdomínios separados
generate_subdomain_config() {
    local frontend_domain="$1"
    local backend_domain="$2"
    local frontend_config="$NGINX_SITES_AVAILABLE/nowhats-frontend-$frontend_domain"
    local backend_config="$NGINX_SITES_AVAILABLE/nowhats-backend-$backend_domain"
    
    log "Gerando configuração Nginx para subdomínios: $frontend_domain e $backend_domain"
    
    # Configuração do Frontend
    cat > "$frontend_config" << EOF
# Configuração Nginx para NoWhats - Frontend
# Domínio: $frontend_domain
# Gerado automaticamente em $(date)

# Redirecionamento HTTP para HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name $frontend_domain;
    
    return 301 https://\$server_name\$request_uri;
}

# Configuração HTTPS do Frontend
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $frontend_domain;
    
    # Certificados SSL
    ssl_certificate /etc/letsencrypt/live/$frontend_domain/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$frontend_domain/privkey.pem;
    
    # Configurações SSL modernas
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-CHACHA20-POLY1305;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Headers de segurança
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Logs
    access_log /var/log/nginx/nowhats-frontend-access.log;
    error_log /var/log/nginx/nowhats-frontend-error.log;
    
    # Frontend React
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        try_files \$uri \$uri/ /index.html;
    }
    
    # Arquivos estáticos com cache
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)\$ {
        proxy_pass http://127.0.0.1:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF
    
    # Configuração do Backend
    cat > "$backend_config" << EOF
# Configuração Nginx para NoWhats - Backend API
# Domínio: $backend_domain
# Gerado automaticamente em $(date)

# Redirecionamento HTTP para HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name $backend_domain;
    
    return 301 https://\$server_name\$request_uri;
}

# Configuração HTTPS do Backend
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $backend_domain;
    
    # Certificados SSL
    ssl_certificate /etc/letsencrypt/live/$backend_domain/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$backend_domain/privkey.pem;
    
    # Configurações SSL modernas
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-CHACHA20-POLY1305;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Headers de segurança
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # CORS para API
    add_header Access-Control-Allow-Origin "https://$frontend_domain" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Authorization, Content-Type, X-Requested-With" always;
    add_header Access-Control-Allow-Credentials "true" always;
    
    # Logs
    access_log /var/log/nginx/nowhats-backend-access.log;
    error_log /var/log/nginx/nowhats-backend-error.log;
    
    # Configuração de upload
    client_max_body_size 100M;
    
    # API Backend
    location / {
        # Handle preflight requests
        if (\$request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin "https://$frontend_domain";
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
            add_header Access-Control-Allow-Headers "Authorization, Content-Type, X-Requested-With";
            add_header Access-Control-Allow-Credentials "true";
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 204;
        }
        
        proxy_pass http://127.0.0.1:3006;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # WebSocket para WhatsApp
    location /ws/ {
        proxy_pass http://127.0.0.1:3006;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
    
    log "✅ Configurações geradas:"
    log "   Frontend: $frontend_config"
    log "   Backend: $backend_config"
}

# =============================================================================
# FUNÇÕES DE CONFIGURAÇÃO
# =============================================================================

# Ativar configurações do Nginx
enable_nginx_sites() {
    local sites=("$@")
    
    log "Ativando sites no Nginx..."
    
    for site in "${sites[@]}"; do
        local site_name=$(basename "$site")
        local symlink="$NGINX_SITES_ENABLED/$site_name"
        
        if [[ ! -L "$symlink" ]]; then
            ln -sf "$site" "$symlink"
            log "✅ Site ativado: $site_name"
        else
            log "ℹ️  Site já ativo: $site_name"
        fi
    done
}

# Desativar configuração padrão do Nginx
disable_default_nginx() {
    local default_site="$NGINX_SITES_ENABLED/default"
    
    if [[ -L "$default_site" ]]; then
        rm -f "$default_site"
        log "✅ Site padrão do Nginx desativado"
    fi
}

# Testar configuração do Nginx
test_nginx_config() {
    log "Testando configuração do Nginx..."
    
    if nginx -t; then
        log "✅ Configuração do Nginx válida"
        return 0
    else
        error "Configuração do Nginx inválida"
        return 1
    fi
}

# Recarregar Nginx
reload_nginx() {
    log "Recarregando Nginx..."
    
    if systemctl reload nginx; then
        log "✅ Nginx recarregado com sucesso"
        return 0
    else
        error "Falha ao recarregar Nginx"
        return 1
    fi
}

# =============================================================================
# FUNÇÃO PRINCIPAL
# =============================================================================

configure_nginx_domains() {
    log "Iniciando configuração automática do Nginx com domínios..."
    
    # Verificar se arquivo de configuração de domínio existe
    if [[ ! -f "$DOMAIN_CONFIG_FILE" ]]; then
        error "Arquivo de configuração de domínio não encontrado: $DOMAIN_CONFIG_FILE"
        error "Execute primeiro o script domain-validator.sh"
        return 1
    fi
    
    # Carregar configuração de domínio
    source "$DOMAIN_CONFIG_FILE"
    
    # Criar diretórios necessários
    mkdir -p "$NGINX_SITES_AVAILABLE" "$NGINX_SITES_ENABLED"
    
    # Configurar baseado no tipo de domínio
    local sites_to_enable=()
    
    if [[ "$DOMAIN_TYPE" == "single" ]]; then
        log "Configurando domínio único: $MAIN_DOMAIN"
        generate_single_domain_config "$MAIN_DOMAIN"
        sites_to_enable+=("$NGINX_SITES_AVAILABLE/nowhats-$MAIN_DOMAIN")
        
    elif [[ "$DOMAIN_TYPE" == "subdomain" ]]; then
        log "Configurando subdomínios: $FRONTEND_DOMAIN e $BACKEND_DOMAIN"
        generate_subdomain_config "$FRONTEND_DOMAIN" "$BACKEND_DOMAIN"
        sites_to_enable+=("$NGINX_SITES_AVAILABLE/nowhats-frontend-$FRONTEND_DOMAIN")
        sites_to_enable+=("$NGINX_SITES_AVAILABLE/nowhats-backend-$BACKEND_DOMAIN")
        
    else
        error "Tipo de domínio inválido: $DOMAIN_TYPE"
        return 1
    fi
    
    # Desativar site padrão
    disable_default_nginx
    
    # Ativar novos sites
    enable_nginx_sites "${sites_to_enable[@]}"
    
    # Testar configuração
    if ! test_nginx_config; then
        error "Configuração do Nginx inválida. Revertendo..."
        # Aqui poderia implementar rollback
        return 1
    fi
    
    # Recarregar Nginx
    if ! reload_nginx; then
        return 1
    fi
    
    log "✅ Configuração do Nginx concluída com sucesso!"
    
    # Mostrar próximos passos
    echo -e "\n${YELLOW}📋 PRÓXIMOS PASSOS:${NC}"
    echo "1. Configure os certificados SSL com Let's Encrypt"
    echo "2. Execute: sudo certbot --nginx"
    
    if [[ "$DOMAIN_TYPE" == "single" ]]; then
        echo "3. Acesse: https://$MAIN_DOMAIN"
    else
        echo "3. Acesse: https://$FRONTEND_DOMAIN"
        echo "4. API disponível em: https://$BACKEND_DOMAIN"
    fi
    
    return 0
}

# Verificar pré-requisitos
check_prerequisites() {
    # Verificar se está rodando como root
    if [[ $EUID -ne 0 ]]; then
        error "Este script deve ser executado como root (use sudo)"
        return 1
    fi
    
    # Verificar se Nginx está instalado
    if ! command -v nginx &> /dev/null; then
        error "Nginx não está instalado"
        return 1
    fi
    
    # Verificar se Nginx está rodando
    if ! systemctl is-active --quiet nginx; then
        log "Iniciando Nginx..."
        systemctl start nginx
    fi
    
    return 0
}

# Função principal
main() {
    echo -e "${BLUE}==============================================================================${NC}"
    echo -e "${BLUE}                    CONFIGURADOR NGINX - NOWHATS${NC}"
    echo -e "${BLUE}==============================================================================${NC}\n"
    
    # Verificar pré-requisitos
    check_prerequisites || exit 1
    
    # Configurar Nginx
    configure_nginx_domains || exit 1
    
    echo -e "\n${GREEN}🎉 Configuração concluída com sucesso!${NC}"
}

# Executar se chamado diretamente
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi