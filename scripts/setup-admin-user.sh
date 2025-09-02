#!/bin/bash

# =============================================================================
# NOWHATS - CONFIGURAÇÃO DE USUÁRIO ADMINISTRADOR PADRÃO
# Cria o primeiro usuário administrador do sistema
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

validate_email() {
    local email="$1"
    local email_regex="^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$"
    
    if [[ $email =~ $email_regex ]]; then
        return 0
    else
        return 1
    fi
}

validate_password() {
    local password="$1"
    
    # Verificar comprimento mínimo
    if [[ ${#password} -lt 8 ]]; then
        echo "Senha deve ter pelo menos 8 caracteres"
        return 1
    fi
    
    # Verificar se contém pelo menos uma letra maiúscula
    if [[ ! $password =~ [A-Z] ]]; then
        echo "Senha deve conter pelo menos uma letra maiúscula"
        return 1
    fi
    
    # Verificar se contém pelo menos uma letra minúscula
    if [[ ! $password =~ [a-z] ]]; then
        echo "Senha deve conter pelo menos uma letra minúscula"
        return 1
    fi
    
    # Verificar se contém pelo menos um número
    if [[ ! $password =~ [0-9] ]]; then
        echo "Senha deve conter pelo menos um número"
        return 1
    fi
    
    return 0
}

generate_secure_password() {
    # Gerar senha segura de 16 caracteres
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-16
}

# =============================================================================
# FUNÇÕES DE CONFIGURAÇÃO
# =============================================================================

wait_for_database() {
    log "Aguardando banco de dados ficar disponível..."
    
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if docker-compose -f /opt/nowhats/docker-compose.yml exec -T postgres pg_isready -U nowhats >/dev/null 2>&1; then
            log "✅ Banco de dados disponível"
            return 0
        fi
        
        log "Tentativa $attempt/$max_attempts - Aguardando banco de dados..."
        sleep 2
        ((attempt++))
    done
    
    error "Timeout: Banco de dados não ficou disponível"
}

create_admin_user() {
    local admin_name="$1"
    local admin_email="$2"
    local admin_password="$3"
    
    log "Criando usuário administrador..."
    
    # Aguardar banco de dados
    wait_for_database
    
    # Criar script SQL para inserir usuário admin
    cat > /tmp/create_admin.sql << EOF
-- Criar usuário administrador padrão
INSERT INTO users (
    name, 
    email, 
    password, 
    role, 
    is_active, 
    email_verified, 
    created_at, 
    updated_at
) VALUES (
    '$admin_name',
    '$admin_email',
    '$admin_password',
    'admin',
    true,
    true,
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    password = EXCLUDED.password,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active,
    email_verified = EXCLUDED.email_verified,
    updated_at = NOW();
EOF
    
    # Executar SQL no banco de dados
    if docker-compose -f /opt/nowhats/docker-compose.yml exec -T postgres psql -U nowhats -d nowhats -f /tmp/create_admin.sql >/dev/null 2>&1; then
        log "✅ Usuário administrador criado/atualizado com sucesso"
        rm -f /tmp/create_admin.sql
    else
        error "Falha ao criar usuário administrador no banco de dados"
    fi
}

create_admin_via_api() {
    local admin_name="$1"
    local admin_email="$2"
    local admin_password="$3"
    local api_url="$4"
    
    log "Criando usuário administrador via API..."
    
    # Aguardar API ficar disponível
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -s --connect-timeout 5 "$api_url/health" >/dev/null 2>&1; then
            log "✅ API disponível"
            break
        fi
        
        log "Tentativa $attempt/$max_attempts - Aguardando API..."
        sleep 2
        ((attempt++))
        
        if [[ $attempt -gt $max_attempts ]]; then
            warn "API não está disponível, tentando criar usuário diretamente no banco"
            create_admin_user "$admin_name" "$admin_email" "$admin_password"
            return
        fi
    done
    
    # Criar usuário via API
    local response
    response=$(curl -s -X POST "$api_url/auth/register" \
        -H "Content-Type: application/json" \
        -d "{
            \"name\": \"$admin_name\",
            \"email\": \"$admin_email\",
            \"password\": \"$admin_password\",
            \"role\": \"admin\"
        }" 2>/dev/null || echo "")
    
    if [[ -n "$response" ]] && echo "$response" | grep -q "success\|created\|token"; then
        log "✅ Usuário administrador criado via API"
    else
        warn "Falha ao criar via API, tentando diretamente no banco"
        create_admin_user "$admin_name" "$admin_email" "$admin_password"
    fi
}

save_admin_credentials() {
    local admin_email="$1"
    local admin_password="$2"
    local domain_info="$3"
    
    # Salvar credenciais em arquivo seguro
    cat > /opt/nowhats/.admin_credentials << EOF
# =============================================================================
# CREDENCIAIS DO ADMINISTRADOR - NOWHATS
# MANTENHA ESTE ARQUIVO SEGURO E PRIVADO
# =============================================================================

# Credenciais do usuário administrador
ADMIN_EMAIL="$admin_email"
ADMIN_PASSWORD="$admin_password"

# Informações de acesso
$domain_info

# Data de criação
CREATED_AT="$(date +'%Y-%m-%d %H:%M:%S')"
EOF
    
    # Definir permissões restritivas
    chmod 600 /opt/nowhats/.admin_credentials
    chown root:root /opt/nowhats/.admin_credentials
    
    log "✅ Credenciais salvas em /opt/nowhats/.admin_credentials"
}

# =============================================================================
# FUNÇÃO PRINCIPAL
# =============================================================================

setup_admin_user_main() {
    echo -e "${BLUE}=== CONFIGURAÇÃO DE USUÁRIO ADMINISTRADOR ===${NC}"
    
    # Carregar configuração de domínios
    local domain_info=""
    if [[ -f "/opt/nowhats/.domain_config" ]]; then
        source "/opt/nowhats/.domain_config"
        
        if [[ "$DOMAIN_TYPE" == "single" ]]; then
            API_URL="https://$MAIN_DOMAIN/api"
            FRONTEND_URL="https://$MAIN_DOMAIN"
            domain_info="FRONTEND_URL=\"https://$MAIN_DOMAIN\""
        elif [[ "$DOMAIN_TYPE" == "subdomain" ]]; then
            API_URL="https://$BACKEND_DOMAIN"
            FRONTEND_URL="https://$FRONTEND_DOMAIN"
            domain_info="FRONTEND_URL=\"https://$FRONTEND_DOMAIN\"\nAPI_URL=\"https://$BACKEND_DOMAIN\""
        else
            API_URL="http://localhost:3006"
            FRONTEND_URL="http://localhost:3000"
            domain_info="FRONTEND_URL=\"http://localhost:3000\"\nAPI_URL=\"http://localhost:3006\""
        fi
    else
        warn "Configuração de domínios não encontrada, usando URLs locais"
        API_URL="http://localhost:3006"
        FRONTEND_URL="http://localhost:3000"
        domain_info="FRONTEND_URL=\"http://localhost:3000\"\nAPI_URL=\"http://localhost:3006\""
    fi
    
    # Carregar configuração de instalação
    local admin_password=""
    if [[ -f "/opt/nowhats/.install_config" ]]; then
        source "/opt/nowhats/.install_config"
        admin_password="$ADMIN_PASSWORD"
    fi
    
    # Coletar informações do administrador
    local admin_name=""
    local admin_email=""
    
    echo -e "\n${YELLOW}Configuração do usuário administrador:${NC}"
    
    # Nome do administrador
    while [[ -z "$admin_name" ]]; do
        read -p "Nome do administrador: " admin_name
        if [[ -z "$admin_name" ]]; then
            echo "Nome é obrigatório"
        fi
    done
    
    # Email do administrador
    while [[ -z "$admin_email" ]]; do
        read -p "Email do administrador: " admin_email
        if [[ -z "$admin_email" ]]; then
            echo "Email é obrigatório"
        elif ! validate_email "$admin_email"; then
            echo "Email inválido"
            admin_email=""
        fi
    done
    
    # Senha do administrador
    if [[ -z "$admin_password" ]]; then
        echo -e "\n${YELLOW}Configuração de senha:${NC}"
        echo "1) Gerar senha segura automaticamente"
        echo "2) Definir senha manualmente"
        
        while true; do
            read -p "Escolha uma opção (1-2): " password_option
            case $password_option in
                1)
                    admin_password=$(generate_secure_password)
                    log "Senha gerada automaticamente"
                    break
                    ;;
                2)
                    while true; do
                        read -s -p "Digite a senha: " admin_password
                        echo
                        
                        if validate_password "$admin_password"; then
                            read -s -p "Confirme a senha: " admin_password_confirm
                            echo
                            
                            if [[ "$admin_password" == "$admin_password_confirm" ]]; then
                                break
                            else
                                echo "Senhas não coincidem"
                            fi
                        fi
                    done
                    break
                    ;;
                *)
                    echo "Opção inválida"
                    ;;
            esac
        done
    fi
    
    # Hash da senha (usando bcrypt se disponível, senão MD5)
    local hashed_password
    if command -v htpasswd >/dev/null 2>&1; then
        hashed_password=$(htpasswd -bnBC 12 "" "$admin_password" | tr -d ':')
    elif command -v openssl >/dev/null 2>&1; then
        hashed_password=$(echo -n "$admin_password" | openssl dgst -sha256 | cut -d' ' -f2)
    else
        hashed_password=$(echo -n "$admin_password" | md5sum | cut -d' ' -f1)
    fi
    
    # Verificar se os containers estão rodando
    if ! docker-compose -f /opt/nowhats/docker-compose.yml ps | grep -q "Up"; then
        log "Iniciando containers..."
        docker-compose -f /opt/nowhats/docker-compose.yml up -d
        sleep 10
    fi
    
    # Criar usuário administrador
    create_admin_via_api "$admin_name" "$admin_email" "$hashed_password" "$API_URL"
    
    # Salvar credenciais
    save_admin_credentials "$admin_email" "$admin_password" "$domain_info"
    
    echo -e "${GREEN}=== USUÁRIO ADMINISTRADOR CONFIGURADO ===${NC}"
    
    echo -e "\n${YELLOW}Credenciais do administrador:${NC}"
    echo "• Nome: $admin_name"
    echo "• Email: $admin_email"
    echo "• Senha: $admin_password"
    
    echo -e "\n${YELLOW}URLs de acesso:${NC}"
    echo "• Frontend: $FRONTEND_URL"
    echo "• API: $API_URL"
    
    echo -e "\n${YELLOW}Informações importantes:${NC}"
    echo "• Credenciais salvas em: /opt/nowhats/.admin_credentials"
    echo "• Altere a senha após o primeiro login"
    echo "• Mantenha as credenciais em local seguro"
    
    echo -e "\n${YELLOW}Para acessar o sistema:${NC}"
    echo "1. Acesse: $FRONTEND_URL"
    echo "2. Faça login com as credenciais acima"
    echo "3. Configure outros usuários e permissões"
}

# Executar configuração principal
setup_admin_user_main "$@"