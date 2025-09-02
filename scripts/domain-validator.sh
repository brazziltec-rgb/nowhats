#!/bin/bash

# =============================================================================
# NOWHATS - VALIDADOR E CONFIGURADOR DE DOMÍNIOS
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
    return 1
}

# =============================================================================
# FUNÇÕES DE VALIDAÇÃO
# =============================================================================

# Validar formato de domínio
validate_domain_format() {
    local domain="$1"
    
    # Regex para validar domínio
    local domain_regex="^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$"
    
    if [[ ! "$domain" =~ $domain_regex ]]; then
        error "Formato de domínio inválido: $domain"
        return 1
    fi
    
    # Verificar se não é muito longo
    if [[ ${#domain} -gt 253 ]]; then
        error "Domínio muito longo: $domain (máximo 253 caracteres)"
        return 1
    fi
    
    return 0
}

# Validar se domínio aponta para o servidor
validate_domain_dns() {
    local domain="$1"
    local server_ip="$2"
    
    log "Verificando DNS para $domain..."
    
    # Obter IP do domínio
    local domain_ip
    domain_ip=$(dig +short "$domain" A | tail -n1)
    
    if [[ -z "$domain_ip" ]]; then
        error "Domínio $domain não resolve para nenhum IP"
        return 1
    fi
    
    if [[ "$domain_ip" != "$server_ip" ]]; then
        error "Domínio $domain aponta para $domain_ip, mas o servidor está em $server_ip"
        return 1
    fi
    
    log "✅ Domínio $domain aponta corretamente para $server_ip"
    return 0
}

# Obter IP público do servidor
get_server_public_ip() {
    local ip
    
    # Tentar diferentes serviços para obter IP público
    ip=$(curl -s https://ipv4.icanhazip.com/ 2>/dev/null) || \
    ip=$(curl -s https://api.ipify.org 2>/dev/null) || \
    ip=$(curl -s https://checkip.amazonaws.com 2>/dev/null) || \
    ip=$(wget -qO- https://ipecho.net/plain 2>/dev/null)
    
    if [[ -z "$ip" ]]; then
        error "Não foi possível obter o IP público do servidor"
        return 1
    fi
    
    echo "$ip"
}

# Verificar se porta está aberta
check_port() {
    local port="$1"
    
    if netstat -tuln | grep -q ":$port "; then
        return 0
    else
        return 1
    fi
}

# =============================================================================
# CONFIGURAÇÃO AUTOMÁTICA DE DOMÍNIOS
# =============================================================================

# Configurar domínio único
configure_single_domain() {
    local domain="$1"
    local server_ip="$2"
    
    log "Configurando domínio único: $domain"
    
    # Validar formato
    validate_domain_format "$domain" || return 1
    
    # Validar DNS (opcional - pode ser configurado depois)
    if ! validate_domain_dns "$domain" "$server_ip"; then
        warn "DNS não está configurado corretamente. Configure o registro A:"
        warn "$domain -> $server_ip"
        
        read -p "Deseja continuar mesmo assim? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return 1
        fi
    fi
    
    # Salvar configuração
    echo "DOMAIN_TYPE=single" > /tmp/domain_config
    echo "MAIN_DOMAIN=$domain" >> /tmp/domain_config
    
    log "✅ Domínio único configurado: $domain"
    return 0
}

# Configurar subdomínios
configure_subdomains() {
    local frontend_domain="$1"
    local backend_domain="$2"
    local server_ip="$3"
    
    log "Configurando subdomínios: $frontend_domain e $backend_domain"
    
    # Validar formatos
    validate_domain_format "$frontend_domain" || return 1
    validate_domain_format "$backend_domain" || return 1
    
    # Verificar se são diferentes
    if [[ "$frontend_domain" == "$backend_domain" ]]; then
        error "Frontend e backend devem ter domínios diferentes"
        return 1
    fi
    
    # Validar DNS para ambos
    local dns_ok=true
    
    if ! validate_domain_dns "$frontend_domain" "$server_ip"; then
        warn "DNS do frontend não configurado: $frontend_domain -> $server_ip"
        dns_ok=false
    fi
    
    if ! validate_domain_dns "$backend_domain" "$server_ip"; then
        warn "DNS do backend não configurado: $backend_domain -> $server_ip"
        dns_ok=false
    fi
    
    if [[ "$dns_ok" == "false" ]]; then
        warn "Configure os registros A no seu provedor de DNS:"
        warn "$frontend_domain -> $server_ip"
        warn "$backend_domain -> $server_ip"
        
        read -p "Deseja continuar mesmo assim? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return 1
        fi
    fi
    
    # Salvar configuração
    echo "DOMAIN_TYPE=subdomain" > /tmp/domain_config
    echo "FRONTEND_DOMAIN=$frontend_domain" >> /tmp/domain_config
    echo "BACKEND_DOMAIN=$backend_domain" >> /tmp/domain_config
    
    log "✅ Subdomínios configurados: $frontend_domain e $backend_domain"
    return 0
}

# =============================================================================
# ASSISTENTE INTERATIVO
# =============================================================================

domain_setup_wizard() {
    local server_ip
    
    echo -e "${BLUE}==============================================================================${NC}"
    echo -e "${BLUE}                    CONFIGURAÇÃO DE DOMÍNIOS - NOWHATS${NC}"
    echo -e "${BLUE}==============================================================================${NC}\n"
    
    # Obter IP do servidor
    log "Obtendo IP público do servidor..."
    server_ip=$(get_server_public_ip)
    if [[ $? -ne 0 ]]; then
        error "Falha ao obter IP público do servidor"
        return 1
    fi
    
    log "IP público do servidor: $server_ip"
    
    echo -e "\n${YELLOW}Escolha o tipo de configuração de domínio:${NC}"
    echo "1) Domínio único (frontend e backend no mesmo domínio)"
    echo "2) Subdomínios separados (frontend e backend em subdomínios diferentes)"
    echo
    
    while true; do
        read -p "Digite sua escolha (1 ou 2): " choice
        
        case $choice in
            1)
                echo -e "\n${YELLOW}Configuração de domínio único selecionada${NC}"
                echo "Exemplo: app.seudominio.com (frontend e backend)"
                echo
                
                while true; do
                    read -p "Digite seu domínio: " domain
                    
                    if [[ -n "$domain" ]]; then
                        if configure_single_domain "$domain" "$server_ip"; then
                            break 2
                        fi
                    else
                        warn "Por favor, digite um domínio válido"
                    fi
                done
                ;;
            2)
                echo -e "\n${YELLOW}Configuração de subdomínios selecionada${NC}"
                echo "Exemplo: app.seudominio.com (frontend) e api.seudominio.com (backend)"
                echo
                
                while true; do
                    read -p "Digite o domínio do frontend: " frontend_domain
                    read -p "Digite o domínio do backend: " backend_domain
                    
                    if [[ -n "$frontend_domain" && -n "$backend_domain" ]]; then
                        if configure_subdomains "$frontend_domain" "$backend_domain" "$server_ip"; then
                            break 2
                        fi
                    else
                        warn "Por favor, digite domínios válidos para frontend e backend"
                    fi
                done
                ;;
            *)
                warn "Escolha inválida. Digite 1 ou 2."
                ;;
        esac
    done
    
    echo -e "\n${GREEN}✅ Configuração de domínios concluída!${NC}"
    
    # Mostrar instruções DNS se necessário
    echo -e "\n${YELLOW}📋 PRÓXIMOS PASSOS:${NC}"
    echo "1. Configure os registros DNS no seu provedor:"
    
    if [[ -f "/tmp/domain_config" ]]; then
        source /tmp/domain_config
        
        if [[ "$DOMAIN_TYPE" == "single" ]]; then
            echo "   $MAIN_DOMAIN -> $server_ip (Registro A)"
        else
            echo "   $FRONTEND_DOMAIN -> $server_ip (Registro A)"
            echo "   $BACKEND_DOMAIN -> $server_ip (Registro A)"
        fi
    fi
    
    echo "2. Aguarde a propagação DNS (pode levar até 24h)"
    echo "3. Execute o script de instalação"
    
    echo -e "\n${BLUE}==============================================================================${NC}"
}

# =============================================================================
# VERIFICAÇÃO DE PRÉ-REQUISITOS
# =============================================================================

check_prerequisites() {
    log "Verificando pré-requisitos..."
    
    # Verificar se está rodando como root
    if [[ $EUID -ne 0 ]]; then
        error "Este script deve ser executado como root (use sudo)"
        return 1
    fi
    
    # Verificar comandos necessários
    local required_commands=("dig" "curl" "netstat")
    
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            error "Comando necessário não encontrado: $cmd"
            return 1
        fi
    done
    
    # Verificar conectividade com internet
    if ! curl -s --connect-timeout 5 https://google.com > /dev/null; then
        error "Sem conectividade com a internet"
        return 1
    fi
    
    log "✅ Pré-requisitos verificados"
    return 0
}

# =============================================================================
# FUNÇÃO PRINCIPAL
# =============================================================================

main() {
    # Verificar pré-requisitos
    check_prerequisites || exit 1
    
    # Executar assistente
    domain_setup_wizard
    
    # Mover configuração para local definitivo
    if [[ -f "/tmp/domain_config" ]]; then
        mv /tmp/domain_config /opt/nowhats/.domain_config
        log "Configuração salva em /opt/nowhats/.domain_config"
    fi
}

# Executar se chamado diretamente
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi