#!/bin/bash

# =============================================================================
# NOWHATS - INSTALADOR AUTOMÁTICO PARA UBUNTU 22.04 - PARTE 2
# Configuração de Domínios, SSL e Finalização
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
   error "Este script (install-part2.sh) deve ser executado como root.\nExecute: sudo bash install-part2.sh\nCertifique-se de ter executado ./install.sh primeiro como usuário normal."
fi

# Carregar variáveis do arquivo de configuração
if [[ -f "/opt/nowhats/.install_config" ]]; then
    source /opt/nowhats/.install_config
else
    error "Arquivo de configuração não encontrado. Execute a parte 1 primeiro."
fi

# Carregar configuração de domínios
if [[ -f "/opt/nowhats/.domain_config" ]]; then
    source /opt/nowhats/.domain_config
else
    error "Configuração de domínios não encontrada. Execute a parte 1 primeiro."
fi

log "Iniciando configuração de domínios e SSL..."

# =============================================================================
# CONFIGURAÇÃO AUTOMÁTICA DE DOMÍNIOS
# =============================================================================

configure_domains() {
    log "Configurando Nginx automaticamente..."
    
    # Obter diretório do script
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/scripts"
    
    # Executar configuração automática do Nginx
    if ! bash "$SCRIPT_DIR/configure-nginx-domains.sh"; then
        error "Falha na configuração automática do Nginx"
    fi
    
    log "✅ Nginx configurado automaticamente com sucesso!"
}

# =============================================================================
# CONFIGURAÇÃO SSL AUTOMÁTICA COM LET'S ENCRYPT
# =============================================================================

configure_ssl() {
    log "Configurando SSL automaticamente..."
    
    # Obter diretório do script
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/scripts"
    
    # Executar configuração automática de SSL
    if ! bash "$SCRIPT_DIR/configure-ssl.sh"; then
        error "Falha na configuração automática de SSL"
    fi
    
    log "✅ SSL configurado automaticamente com sucesso!"
}

# =============================================================================
# CONFIGURAÇÃO DO AMBIENTE DE PRODUÇÃO
# =============================================================================

configure_production_env() {
    log "Configurando ambiente de produção..."
    
    # Criar arquivo .env para produção
    cat > /opt/nowhats/.env << EOF
# =============================================================================
# CONFIGURAÇÃO DE PRODUÇÃO - NOWHATS
# =============================================================================

# Ambiente
NODE_ENV=production
PORT=3006
FRONTEND_PORT=3000

# Banco de dados PostgreSQL
DB_HOST=postgres
DB_PORT=5432
DB_NAME=nowhats
DB_USER=nowhats
DB_PASSWORD=$DB_PASSWORD
DATABASE_URL=postgresql://nowhats:$DB_PASSWORD@postgres:5432/nowhats

# JWT
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d

# URLs da aplicação
if [[ "$DOMAIN_TYPE" == "single" ]]; then
APP_URL=https://$MAIN_DOMAIN
API_URL=https://$MAIN_DOMAIN/api
FRONTEND_URL=https://$MAIN_DOMAIN
else
APP_URL=https://$FRONTEND_DOMAIN
API_URL=https://$BACKEND_DOMAIN
FRONTEND_URL=https://$FRONTEND_DOMAIN
fi

# APIs WhatsApp
BAILEYS_API_URL=http://baileys:3001
EVOLUTION_API_URL=http://evolution:8080
WEBJS_API_URL=http://webjs:3002

# Redis (opcional)
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=$REDIS_PASSWORD

# Configurações de segurança
CORS_ORIGIN=$([[ "$DOMAIN_TYPE" == "single" ]] && echo "https://$MAIN_DOMAIN" || echo "https://$FRONTEND_DOMAIN")
SECURE_COOKIES=true
SAME_SITE=strict

# Logs
LOG_LEVEL=info
LOG_FILE=/opt/nowhats/logs/app.log

# Upload de arquivos
UPLOAD_MAX_SIZE=50mb
UPLOAD_PATH=/opt/nowhats/uploads

# Webhook
WEBHOOK_SECRET=$WEBHOOK_SECRET

# Rate limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# Session
SESSION_SECRET=$SESSION_SECRET
SESSION_MAX_AGE=86400000
EOF

    # Ajustar permissões
    chown -R 1000:1000 /opt/nowhats
    chmod 600 /opt/nowhats/.env
    
    # Criar diretórios necessários
    mkdir -p /opt/nowhats/logs
    mkdir -p /opt/nowhats/uploads
    mkdir -p /opt/nowhats/backups
    
    chown -R 1000:1000 /opt/nowhats/logs
    chown -R 1000:1000 /opt/nowhats/uploads
    chown -R 1000:1000 /opt/nowhats/backups
    
    log "Ambiente de produção configurado!"
}

# =============================================================================
# INICIALIZAÇÃO DOS SERVIÇOS
# =============================================================================

start_services() {
    log "Iniciando serviços..."
    
    cd /opt/nowhats
    
    # Parar serviços se estiverem rodando
    docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
    
    # Construir e iniciar serviços
    log "Construindo imagens Docker..."
    docker-compose -f docker-compose.prod.yml build --no-cache
    
    log "Iniciando containers..."
    docker-compose -f docker-compose.prod.yml up -d
    
    # Aguardar serviços ficarem prontos
    log "Aguardando serviços ficarem prontos..."
    sleep 30
    
    # Verificar status dos containers
    if docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
        log "Containers iniciados com sucesso!"
    else
        error "Falha ao iniciar alguns containers"
    fi
    
    # Executar migrações do banco
    log "Executando migrações do banco de dados..."
    docker-compose -f docker-compose.prod.yml exec -T backend npm run migrate || warn "Falha nas migrações - verifique manualmente"
    
    log "Serviços iniciados com sucesso!"
}

# =============================================================================
# CRIAÇÃO DO USUÁRIO ADMIN
# =============================================================================

# =============================================================================
# CONFIGURAÇÃO DE USUÁRIO ADMINISTRADOR
# =============================================================================

create_admin_user() {
    log "Configurando usuário administrador..."
    
    # Obter diretório do script
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/scripts"
    
    # Executar configuração de usuário administrador
    if ! bash "$SCRIPT_DIR/setup-admin-user.sh"; then
        error "Falha na configuração do usuário administrador"
    fi
    
    log "✅ Usuário administrador configurado com sucesso!"
}

# =============================================================================
# CONFIGURAÇÃO DE BACKUP AUTOMÁTICO
# =============================================================================

configure_backup() {
    log "Configurando backup automático..."
    
    # Script de backup
    cat > /opt/nowhats/backup.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/opt/nowhats/backups"
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="nowhats_backup_$DATE.sql"

# Criar backup do banco
docker-compose -f /opt/nowhats/docker-compose.prod.yml exec -T postgres \
    pg_dump -U nowhats nowhats > "$BACKUP_DIR/$BACKUP_FILE"

# Compactar backup
gzip "$BACKUP_DIR/$BACKUP_FILE"

# Manter apenas os últimos 7 backups
find "$BACKUP_DIR" -name "nowhats_backup_*.sql.gz" -mtime +7 -delete

echo "Backup criado: $BACKUP_FILE.gz"
EOF

    chmod +x /opt/nowhats/backup.sh
    
    # Configurar cron para backup diário às 2h
    (crontab -l 2>/dev/null; echo "0 2 * * * /opt/nowhats/backup.sh >> /opt/nowhats/logs/backup.log 2>&1") | crontab -
    
    log "Backup automático configurado!"
}

# =============================================================================
# EXECUÇÃO PRINCIPAL
# =============================================================================

main() {
    log "=== NOWHATS - CONFIGURAÇÃO FINAL ==="
    
    configure_domains
    configure_ssl
    configure_production_env
    start_services
    create_admin_user
    configure_backup
    
    # Limpar arquivo de configuração temporário
    rm -f /opt/nowhats/.install_config
    
    log "=== INSTALAÇÃO CONCLUÍDA COM SUCESSO! ==="
    
    # Mostrar resumo da instalação
    echo -e "\n${BLUE}==============================================================================${NC}"
    echo -e "${BLUE}                    RESUMO DA INSTALAÇÃO - NOWHATS${NC}"
    echo -e "${BLUE}==============================================================================${NC}\n"
    
    echo -e "${GREEN}✅ Sistema instalado com sucesso!${NC}\n"
    
    echo -e "${YELLOW}📋 INFORMAÇÕES DE ACESSO:${NC}"
    if [[ "$DOMAIN_TYPE" == "single" ]]; then
        echo -e "   🌐 URL da Aplicação: ${GREEN}https://$MAIN_DOMAIN${NC}"
        echo -e "   🔗 API Backend: ${GREEN}https://$MAIN_DOMAIN/api${NC}"
    else
        echo -e "   🌐 Frontend: ${GREEN}https://$FRONTEND_DOMAIN${NC}"
        echo -e "   🔗 Backend API: ${GREEN}https://$BACKEND_DOMAIN${NC}"
    fi
    
    echo -e "\n${YELLOW}👤 USUÁRIO ADMINISTRADOR:${NC}"
    echo -e "   📧 Email: ${GREEN}$ADMIN_EMAIL${NC}"
    echo -e "   🔑 Senha: ${GREEN}$ADMIN_PASSWORD${NC}"
    
    echo -e "\n${YELLOW}🐳 SERVIÇOS DOCKER:${NC}"
    echo -e "   • PostgreSQL (Banco de dados)"
    echo -e "   • Backend Node.js"
    echo -e "   • Frontend React"
    echo -e "   • API Baileys"
    echo -e "   • API Evolution"
    echo -e "   • API Web.js"
    echo -e "   • Redis (Cache)"
    
    echo -e "\n${YELLOW}🔧 COMANDOS ÚTEIS:${NC}"
    echo -e "   • Ver logs: ${GREEN}cd /opt/nowhats && docker-compose -f docker-compose.prod.yml logs -f${NC}"
    echo -e "   • Reiniciar: ${GREEN}cd /opt/nowhats && docker-compose -f docker-compose.prod.yml restart${NC}"
    echo -e "   • Parar: ${GREEN}cd /opt/nowhats && docker-compose -f docker-compose.prod.yml down${NC}"
    echo -e "   • Iniciar: ${GREEN}cd /opt/nowhats && docker-compose -f docker-compose.prod.yml up -d${NC}"
    
    echo -e "\n${YELLOW}📁 DIRETÓRIOS IMPORTANTES:${NC}"
    echo -e "   • Aplicação: ${GREEN}/opt/nowhats${NC}"
    echo -e "   • Logs: ${GREEN}/opt/nowhats/logs${NC}"
    echo -e "   • Backups: ${GREEN}/opt/nowhats/backups${NC}"
    echo -e "   • Uploads: ${GREEN}/opt/nowhats/uploads${NC}"
    
    echo -e "\n${YELLOW}🔒 SEGURANÇA:${NC}"
    echo -e "   • SSL/HTTPS configurado automaticamente"
    echo -e "   • Firewall UFW ativo (portas 22, 80, 443)"
    echo -e "   • Rate limiting configurado"
    echo -e "   • Backup automático diário às 2h"
    
    echo -e "\n${YELLOW}⚠️  IMPORTANTE:${NC}"
    echo -e "   • Altere a senha do administrador no primeiro acesso"
    echo -e "   • Configure os webhooks das APIs conforme necessário"
    echo -e "   • Monitore os logs regularmente"
    
    echo -e "\n${BLUE}==============================================================================${NC}"
    echo -e "${GREEN}🎉 NoWhats está pronto para uso! Acesse a URL acima para começar.${NC}"
    echo -e "${BLUE}==============================================================================${NC}\n"
}

# Executar instalação
main "$@"