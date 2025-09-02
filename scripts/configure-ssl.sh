#!/bin/bash

# =============================================================================
# NOWHATS - CONFIGURAÇÃO SSL AUTOMÁTICA COM LET'S ENCRYPT
# Configura certificados SSL automaticamente para domínios configurados
# =============================================================================

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
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Verificar se está rodando como root
if [[ $EUID -ne 0 ]]; then
   error "Este script deve ser executado como root (use sudo)"
fi

# =============================================================================
# FUNÇÕES DE VALIDAÇÃO
# =============================================================================

check_prerequisites() {
    log "Verificando pré-requisitos para SSL..."
    
    # Verificar se o Nginx está instalado e rodando
    if ! command -v nginx >/dev/null 2>&1; then
        error "Nginx não está instalado"
    fi
    
    if ! systemctl is-active --quiet nginx; then
        warn "Nginx não está rodando, tentando iniciar..."
        systemctl start nginx || error "Falha ao iniciar o Nginx"
    fi
    
    # Verificar se o Certbot está instalado
    if ! command -v certbot >/dev/null 2>&1; then
        log "Instalando Certbot..."
        apt-get update
        apt-get install -y certbot python3-certbot-nginx
    fi
    
    # Verificar conectividade com a internet
    if ! curl -s --connect-timeout 5 https://acme-v02.api.letsencrypt.org/directory >/dev/null; then
        error "Sem conectividade com Let's Encrypt. Verifique sua conexão com a internet."
    fi
    
    log "✅ Pré-requisitos verificados"
}

validate_domain_accessibility() {
    local domain="$1"
    local port="${2:-80}"
    
    log "Validando acessibilidade do domínio: $domain"
    
    # Verificar se o domínio resolve para o IP correto
    local domain_ip
    domain_ip=$(dig +short "$domain" | tail -n1)
    
    if [[ -z "$domain_ip" ]]; then
        error "Domínio $domain não resolve para nenhum IP"
    fi
    
    # Obter IP público do servidor
    local server_ip
    server_ip=$(curl -s --connect-timeout 5 ifconfig.me || curl -s --connect-timeout 5 ipinfo.io/ip || echo "")
    
    if [[ -z "$server_ip" ]]; then
        warn "Não foi possível obter o IP público do servidor"
    elif [[ "$domain_ip" != "$server_ip" ]]; then
        warn "Domínio $domain ($domain_ip) não aponta para este servidor ($server_ip)"
        echo "Certifique-se de que o registro DNS A está configurado corretamente."
        read -p "Deseja continuar mesmo assim? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            error "Configuração SSL cancelada pelo usuário"
        fi
    else
        log "✅ Domínio $domain aponta corretamente para este servidor"
    fi
    
    # Testar se o domínio está acessível via HTTP
    if curl -s --connect-timeout 10 "http://$domain" >/dev/null; then
        log "✅ Domínio $domain acessível via HTTP"
    else
        warn "Domínio $domain não está acessível via HTTP"
        warn "Certifique-se de que o Nginx está configurado corretamente"
    fi
}

# =============================================================================
# FUNÇÕES DE CONFIGURAÇÃO SSL
# =============================================================================

obtain_ssl_certificate() {
    local domain="$1"
    local email="$2"
    
    log "Obtendo certificado SSL para: $domain"
    
    # Validar domínio antes de tentar obter certificado
    validate_domain_accessibility "$domain"
    
    # Tentar obter certificado
    if certbot --nginx -d "$domain" \
        --non-interactive \
        --agree-tos \
        --email "$email" \
        --redirect \
        --no-eff-email; then
        log "✅ Certificado SSL obtido com sucesso para $domain"
    else
        error "Falha ao obter certificado SSL para $domain"
    fi
}

setup_ssl_renewal() {
    log "Configurando renovação automática de certificados..."
    
    # Criar script de renovação personalizado
    cat > /opt/nowhats/scripts/renew-ssl.sh << 'EOF'
#!/bin/bash

# Script de renovação automática de certificados SSL
# Executado pelo cron diariamente

LOG_FILE="/var/log/nowhats-ssl-renewal.log"

echo "[$(date)] Iniciando renovação de certificados SSL" >> "$LOG_FILE"

# Tentar renovar certificados
if /usr/bin/certbot renew --quiet --nginx; then
    echo "[$(date)] Certificados renovados com sucesso" >> "$LOG_FILE"
    
    # Recarregar Nginx se houve renovação
    if systemctl reload nginx; then
        echo "[$(date)] Nginx recarregado com sucesso" >> "$LOG_FILE"
    else
        echo "[$(date)] ERRO: Falha ao recarregar Nginx" >> "$LOG_FILE"
    fi
else
    echo "[$(date)] ERRO: Falha na renovação de certificados" >> "$LOG_FILE"
fi

echo "[$(date)] Renovação concluída" >> "$LOG_FILE"
EOF
    
    chmod +x /opt/nowhats/scripts/renew-ssl.sh
    
    # Configurar cron job para renovação automática
    # Executar diariamente às 2:30 AM
    (crontab -l 2>/dev/null | grep -v "nowhats-ssl-renewal"; echo "30 2 * * * /opt/nowhats/scripts/renew-ssl.sh") | crontab -
    
    # Testar renovação
    log "Testando processo de renovação..."
    if certbot renew --dry-run --quiet; then
        log "✅ Teste de renovação bem-sucedido"
    else
        warn "Teste de renovação falhou, mas os certificados foram instalados"
    fi
    
    log "✅ Renovação automática configurada"
}

configure_ssl_security() {
    log "Configurando segurança SSL avançada..."
    
    # Criar configuração SSL segura
    cat > /etc/nginx/snippets/ssl-params.conf << 'EOF'
# Configurações SSL seguras para Nginx
# Gerado automaticamente pelo instalador NoWhats

# Protocolos SSL/TLS seguros
ssl_protocols TLSv1.2 TLSv1.3;

# Ciphers seguros
ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384:ECDHE-RSA-AES128-SHA:ECDHE-RSA-AES256-SHA:DHE-RSA-AES128-SHA256:DHE-RSA-AES256-SHA256:DHE-RSA-AES128-SHA:DHE-RSA-AES256-SHA:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA;

# Preferir ciphers do servidor
ssl_prefer_server_ciphers on;

# Configurações de sessão SSL
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;

# OCSP Stapling
ssl_stapling on;
ssl_stapling_verify on;
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;

# Headers de segurança
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
add_header X-Content-Type-Options nosniff always;
add_header X-Frame-Options DENY always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;

# Desabilitar server tokens
server_tokens off;
EOF
    
    log "✅ Configurações de segurança SSL aplicadas"
}

# =============================================================================
# FUNÇÃO PRINCIPAL
# =============================================================================

configure_ssl_main() {
    echo -e "${BLUE}=== CONFIGURAÇÃO SSL AUTOMÁTICA ===${NC}"
    
    # Carregar configuração de domínios
    if [[ -f "/opt/nowhats/.domain_config" ]]; then
        source "/opt/nowhats/.domain_config"
    else
        error "Configuração de domínios não encontrada. Execute a configuração de domínios primeiro."
    fi
    
    # Carregar configuração de instalação
    if [[ -f "/opt/nowhats/.install_config" ]]; then
        source "/opt/nowhats/.install_config"
    else
        error "Configuração de instalação não encontrada."
    fi
    
    # Verificar se o email SSL foi configurado
    if [[ -z "$SSL_EMAIL" ]]; then
        read -p "Digite seu email para Let's Encrypt: " SSL_EMAIL
        if [[ -z "$SSL_EMAIL" ]]; then
            error "Email é obrigatório para Let's Encrypt"
        fi
    fi
    
    # Verificar pré-requisitos
    check_prerequisites
    
    # Configurar SSL baseado no tipo de domínio
    if [[ "$DOMAIN_TYPE" == "single" ]]; then
        log "Configurando SSL para domínio único: $MAIN_DOMAIN"
        obtain_ssl_certificate "$MAIN_DOMAIN" "$SSL_EMAIL"
        
    elif [[ "$DOMAIN_TYPE" == "subdomain" ]]; then
        log "Configurando SSL para subdomínios: $FRONTEND_DOMAIN e $BACKEND_DOMAIN"
        
        # Certificado para frontend
        obtain_ssl_certificate "$FRONTEND_DOMAIN" "$SSL_EMAIL"
        
        # Certificado para backend
        obtain_ssl_certificate "$BACKEND_DOMAIN" "$SSL_EMAIL"
        
    else
        error "Tipo de domínio inválido: $DOMAIN_TYPE"
    fi
    
    # Configurar segurança SSL avançada
    configure_ssl_security
    
    # Configurar renovação automática
    setup_ssl_renewal
    
    # Testar configuração final
    log "Testando configuração final do Nginx..."
    if nginx -t; then
        log "Recarregando Nginx..."
        systemctl reload nginx
        log "✅ Nginx recarregado com sucesso"
    else
        error "Erro na configuração do Nginx"
    fi
    
    echo -e "${GREEN}=== SSL CONFIGURADO COM SUCESSO ===${NC}"
    
    # Mostrar informações dos certificados
    echo -e "\n${YELLOW}Certificados SSL instalados:${NC}"
    if [[ "$DOMAIN_TYPE" == "single" ]]; then
        echo "• $MAIN_DOMAIN"
        echo "  URL: https://$MAIN_DOMAIN"
    else
        echo "• $FRONTEND_DOMAIN (Frontend)"
        echo "  URL: https://$FRONTEND_DOMAIN"
        echo "• $BACKEND_DOMAIN (Backend/API)"
        echo "  URL: https://$BACKEND_DOMAIN"
    fi
    
    echo -e "\n${YELLOW}Renovação automática:${NC}"
    echo "• Configurada para executar diariamente às 2:30 AM"
    echo "• Logs em: /var/log/nowhats-ssl-renewal.log"
    echo "• Script: /opt/nowhats/scripts/renew-ssl.sh"
    
    echo -e "\n${YELLOW}Para verificar o status dos certificados:${NC}"
    echo "sudo certbot certificates"
    
    echo -e "\n${YELLOW}Para testar renovação manualmente:${NC}"
    echo "sudo certbot renew --dry-run"
}

# Executar configuração principal
configure_ssl_main "$@"