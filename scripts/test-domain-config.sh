#!/bin/bash

# =============================================================================
# NOWHATS - SCRIPT DE TESTE DE CONFIGURAÇÃO DE DOMÍNIOS
# Valida se a configuração automática de domínios está funcionando
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
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

fail() {
    echo -e "${RED}❌ $1${NC}"
}

# =============================================================================
# FUNÇÕES DE TESTE
# =============================================================================

test_domain_validator() {
    log "Testando domain-validator.sh..."
    
    if [[ -f "domain-validator.sh" ]]; then
        success "Script domain-validator.sh encontrado"
        
        # Verificar se o script é executável
        if [[ -x "domain-validator.sh" ]]; then
            success "Script domain-validator.sh é executável"
        else
            warn "Script domain-validator.sh não é executável, corrigindo..."
            chmod +x domain-validator.sh
        fi
        
        # Testar funções básicas
        if bash -n domain-validator.sh; then
            success "Sintaxe do domain-validator.sh está correta"
        else
            fail "Erro de sintaxe no domain-validator.sh"
            return 1
        fi
    else
        fail "Script domain-validator.sh não encontrado"
        return 1
    fi
}

test_nginx_configurator() {
    log "Testando configure-nginx-domains.sh..."
    
    if [[ -f "configure-nginx-domains.sh" ]]; then
        success "Script configure-nginx-domains.sh encontrado"
        
        # Verificar se o script é executável
        if [[ -x "configure-nginx-domains.sh" ]]; then
            success "Script configure-nginx-domains.sh é executável"
        else
            warn "Script configure-nginx-domains.sh não é executável, corrigindo..."
            chmod +x configure-nginx-domains.sh
        fi
        
        # Testar sintaxe
        if bash -n configure-nginx-domains.sh; then
            success "Sintaxe do configure-nginx-domains.sh está correta"
        else
            fail "Erro de sintaxe no configure-nginx-domains.sh"
            return 1
        fi
    else
        fail "Script configure-nginx-domains.sh não encontrado"
        return 1
    fi
}

test_install_scripts() {
    log "Testando scripts de instalação..."
    
    # Testar install.sh
    if [[ -f "../install.sh" ]]; then
        success "Script install.sh encontrado"
        
        if bash -n ../install.sh; then
            success "Sintaxe do install.sh está correta"
        else
            fail "Erro de sintaxe no install.sh"
            return 1
        fi
    else
        fail "Script install.sh não encontrado"
        return 1
    fi
    
    # Testar install-part2.sh
    if [[ -f "../install-part2.sh" ]]; then
        success "Script install-part2.sh encontrado"
        
        if bash -n ../install-part2.sh; then
            success "Sintaxe do install-part2.sh está correta"
        else
            fail "Erro de sintaxe no install-part2.sh"
            return 1
        fi
    else
        fail "Script install-part2.sh não encontrado"
        return 1
    fi
}

test_nginx_templates() {
    log "Testando templates do Nginx..."
    
    if [[ -f "../nginx/nowhats.conf" ]]; then
        success "Template nginx/nowhats.conf encontrado"
        
        # Verificar se contém placeholders necessários
        if grep -q "MAIN_DOMAIN_PLACEHOLDER\|FRONTEND_DOMAIN_PLACEHOLDER\|BACKEND_DOMAIN_PLACEHOLDER" ../nginx/nowhats.conf; then
            success "Placeholders encontrados no template Nginx"
        else
            warn "Placeholders não encontrados no template Nginx"
        fi
    else
        fail "Template nginx/nowhats.conf não encontrado"
        return 1
    fi
}

test_dependencies() {
    log "Testando dependências do sistema..."
    
    # Verificar comandos necessários
    local deps=("dig" "curl" "netstat")
    local missing_deps=()
    
    for dep in "${deps[@]}"; do
        if command -v "$dep" >/dev/null 2>&1; then
            success "Comando $dep disponível"
        else
            fail "Comando $dep não encontrado"
            missing_deps+=("$dep")
        fi
    done
    
    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        warn "Dependências faltando: ${missing_deps[*]}"
        log "Para instalar: sudo apt-get update && sudo apt-get install -y dnsutils curl net-tools"
        return 1
    fi
}

test_permissions() {
    log "Testando permissões..."
    
    # Verificar se pode criar arquivos temporários
    if touch /tmp/nowhats_test 2>/dev/null; then
        success "Permissão de escrita em /tmp disponível"
        rm -f /tmp/nowhats_test
    else
        fail "Sem permissão de escrita em /tmp"
        return 1
    fi
    
    # Verificar se está rodando como root (necessário para instalação)
    if [[ $EUID -eq 0 ]]; then
        success "Executando como root"
    else
        warn "Não está executando como root (necessário para instalação completa)"
    fi
}

# =============================================================================
# EXECUÇÃO DOS TESTES
# =============================================================================

main() {
    echo -e "${BLUE}=== TESTE DE CONFIGURAÇÃO AUTOMÁTICA DE DOMÍNIOS ===${NC}"
    echo "Validando scripts e dependências..."
    echo
    
    local failed_tests=0
    
    # Executar testes
    test_dependencies || ((failed_tests++))
    echo
    
    test_permissions || ((failed_tests++))
    echo
    
    test_domain_validator || ((failed_tests++))
    echo
    
    test_nginx_configurator || ((failed_tests++))
    echo
    
    test_install_scripts || ((failed_tests++))
    echo
    
    test_nginx_templates || ((failed_tests++))
    echo
    
    # Resultado final
    if [[ $failed_tests -eq 0 ]]; then
        echo -e "${GREEN}=== TODOS OS TESTES PASSARAM ===${NC}"
        success "Configuração automática de domínios está pronta para uso!"
        echo
        echo -e "${YELLOW}Próximos passos:${NC}"
        echo "1. Execute: sudo bash install.sh"
        echo "2. Siga as instruções do assistente de domínios"
        echo "3. Execute: sudo bash install-part2.sh"
    else
        echo -e "${RED}=== $failed_tests TESTE(S) FALHARAM ===${NC}"
        fail "Corrija os problemas antes de prosseguir com a instalação"
        exit 1
    fi
}

# Verificar se está no diretório correto
if [[ ! -f "domain-validator.sh" ]] && [[ ! -f "scripts/domain-validator.sh" ]]; then
    error "Execute este script no diretório raiz do projeto ou no diretório scripts/"
    exit 1
fi

# Mudar para o diretório scripts se necessário
if [[ -f "scripts/domain-validator.sh" ]]; then
    cd scripts
fi

main "$@"