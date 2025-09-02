#!/bin/bash

# =============================================================================
# NOWHATS - CRIADOR DE USUÁRIO ADMINISTRADOR
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

# =============================================================================
# FUNÇÕES DE VALIDAÇÃO
# =============================================================================

# Validar formato de email
validate_email() {
    local email="$1"
    local email_regex="^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    
    if [[ ! "$email" =~ $email_regex ]]; then
        return 1
    fi
    
    return 0
}

# Validar força da senha
validate_password_strength() {
    local password="$1"
    local min_length=8
    
    # Verificar comprimento mínimo
    if [[ ${#password} -lt $min_length ]]; then
        echo "Senha deve ter pelo menos $min_length caracteres"
        return 1
    fi
    
    # Verificar se contém pelo menos uma letra minúscula
    if [[ ! "$password" =~ [a-z] ]]; then
        echo "Senha deve conter pelo menos uma letra minúscula"
        return 1
    fi
    
    # Verificar se contém pelo menos uma letra maiúscula
    if [[ ! "$password" =~ [A-Z] ]]; then
        echo "Senha deve conter pelo menos uma letra maiúscula"
        return 1
    fi
    
    # Verificar se contém pelo menos um número
    if [[ ! "$password" =~ [0-9] ]]; then
        echo "Senha deve conter pelo menos um número"
        return 1
    fi
    
    # Verificar se contém pelo menos um caractere especial
    if [[ ! "$password" =~ [^a-zA-Z0-9] ]]; then
        echo "Senha deve conter pelo menos um caractere especial (!@#$%^&*)"
        return 1
    fi
    
    return 0
}

# Gerar senha segura
generate_secure_password() {
    local length=${1:-16}
    
    # Caracteres permitidos
    local chars="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
    
    # Gerar senha
    local password=""
    for i in $(seq 1 $length); do
        password+="${chars:RANDOM%${#chars}:1}"
    done
    
    echo "$password"
}

# =============================================================================
# CRIAÇÃO DO USUÁRIO ADMIN
# =============================================================================

# Criar usuário admin no banco de dados
create_admin_in_database() {
    local name="$1"
    local email="$2"
    local password="$3"
    
    log "Criando usuário administrador no banco de dados..."
    
    # Script Node.js para criar usuário
    cat > /tmp/create_admin_user.js << 'EOF'
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

// Configuração do banco
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'nowhats',
    user: process.env.DB_USER || 'nowhats',
    password: process.env.DB_PASSWORD,
});

async function createAdminUser() {
    const client = await pool.connect();
    
    try {
        const name = process.env.ADMIN_NAME;
        const email = process.env.ADMIN_EMAIL;
        const password = process.env.ADMIN_PASSWORD;
        
        // Hash da senha
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // Verificar se usuário já existe
        const existingUser = await client.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );
        
        if (existingUser.rows.length > 0) {
            console.log('Usuário já existe. Atualizando senha...');
            
            // Atualizar usuário existente
            await client.query(
                `UPDATE users SET 
                    name = $1,
                    password = $2,
                    role = $3,
                    is_active = $4,
                    updated_at = NOW()
                WHERE email = $5`,
                [name, hashedPassword, 'admin', true, email]
            );
        } else {
            console.log('Criando novo usuário administrador...');
            
            // Criar novo usuário
            await client.query(
                `INSERT INTO users (
                    name, email, password, role, is_active, 
                    email_verified_at, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), NOW())`,
                [name, email, hashedPassword, 'admin', true]
            );
        }
        
        console.log('✅ Usuário administrador criado/atualizado com sucesso!');
        console.log(`📧 Email: ${email}`);
        console.log(`👤 Nome: ${name}`);
        console.log(`🔑 Senha: ${password}`);
        
    } catch (error) {
        console.error('❌ Erro ao criar usuário administrador:', error.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

createAdminUser();
EOF

    # Executar script no container do backend
    if docker-compose -f /opt/nowhats/docker-compose.prod.yml ps | grep -q "backend.*Up"; then
        log "Executando criação do usuário no container backend..."
        
        docker-compose -f /opt/nowhats/docker-compose.prod.yml exec -T backend \
            env ADMIN_NAME="$name" \
                ADMIN_EMAIL="$email" \
                ADMIN_PASSWORD="$password" \
            node /tmp/create_admin_user.js
    else
        # Se o container não estiver rodando, tentar conexão direta
        log "Container backend não está rodando. Tentando conexão direta..."
        
        # Carregar variáveis de ambiente
        if [[ -f "/opt/nowhats/.env" ]]; then
            source /opt/nowhats/.env
        fi
        
        # Executar script localmente (se Node.js estiver instalado)
        if command -v node &> /dev/null; then
            cd /opt/nowhats/backend
            
            env ADMIN_NAME="$name" \
                ADMIN_EMAIL="$email" \
                ADMIN_PASSWORD="$password" \
                DB_HOST="localhost" \
                DB_PORT="5433" \
            node /tmp/create_admin_user.js
        else
            error "Não foi possível criar usuário. Container backend não está rodando e Node.js não está instalado."
        fi
    fi
    
    # Limpar arquivo temporário
    rm -f /tmp/create_admin_user.js
    
    log "✅ Usuário administrador configurado!"
}

# =============================================================================
# ASSISTENTE INTERATIVO
# =============================================================================

admin_setup_wizard() {
    echo -e "${BLUE}==============================================================================${NC}"
    echo -e "${BLUE}                    CONFIGURAÇÃO DE USUÁRIO ADMINISTRADOR${NC}"
    echo -e "${BLUE}==============================================================================${NC}\n"
    
    local name email password confirm_password
    
    # Nome do administrador
    while true; do
        read -p "Digite o nome do administrador: " name
        
        if [[ -n "$name" && ${#name} -ge 2 ]]; then
            break
        else
            warn "Nome deve ter pelo menos 2 caracteres"
        fi
    done
    
    # Email do administrador
    while true; do
        read -p "Digite o email do administrador: " email
        
        if validate_email "$email"; then
            break
        else
            warn "Email inválido. Use o formato: usuario@dominio.com"
        fi
    done
    
    # Opção de senha
    echo -e "\n${YELLOW}Escolha o tipo de senha:${NC}"
    echo "1) Gerar senha segura automaticamente (recomendado)"
    echo "2) Definir senha manualmente"
    echo
    
    while true; do
        read -p "Digite sua escolha (1 ou 2): " choice
        
        case $choice in
            1)
                password=$(generate_secure_password 16)
                log "Senha gerada automaticamente: $password"
                break
                ;;
            2)
                while true; do
                    echo -e "\n${YELLOW}Requisitos da senha:${NC}"
                    echo "• Mínimo 8 caracteres"
                    echo "• Pelo menos 1 letra minúscula"
                    echo "• Pelo menos 1 letra maiúscula"
                    echo "• Pelo menos 1 número"
                    echo "• Pelo menos 1 caractere especial (!@#$%^&*)"
                    echo
                    
                    read -s -p "Digite a senha: " password
                    echo
                    read -s -p "Confirme a senha: " confirm_password
                    echo
                    
                    if [[ "$password" != "$confirm_password" ]]; then
                        warn "Senhas não coincidem. Tente novamente."
                        continue
                    fi
                    
                    local validation_result
                    validation_result=$(validate_password_strength "$password")
                    
                    if [[ $? -eq 0 ]]; then
                        log "✅ Senha válida!"
                        break
                    else
                        warn "Senha não atende aos requisitos: $validation_result"
                    fi
                done
                break
                ;;
            *)
                warn "Escolha inválida. Digite 1 ou 2."
                ;;
        esac
    done
    
    # Confirmar dados
    echo -e "\n${YELLOW}📋 RESUMO DO USUÁRIO ADMINISTRADOR:${NC}"
    echo "Nome: $name"
    echo "Email: $email"
    echo "Senha: [OCULTA]"
    echo
    
    read -p "Confirma a criação do usuário? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Criar usuário
        create_admin_in_database "$name" "$email" "$password"
        
        # Salvar informações (sem a senha) para referência
        cat > /opt/nowhats/.admin_info << EOF
# Informações do usuário administrador
ADMIN_NAME="$name"
ADMIN_EMAIL="$email"
ADMIN_CREATED_AT="$(date)"
EOF
        
        chmod 600 /opt/nowhats/.admin_info
        
        echo -e "\n${GREEN}✅ Usuário administrador criado com sucesso!${NC}"
        echo -e "\n${YELLOW}📋 INFORMAÇÕES DE ACESSO:${NC}"
        echo -e "Email: ${GREEN}$email${NC}"
        echo -e "Senha: ${GREEN}$password${NC}"
        echo -e "\n${RED}⚠️  IMPORTANTE: Anote essas informações em local seguro!${NC}"
        echo -e "${RED}⚠️  Altere a senha no primeiro acesso por segurança.${NC}"
        
        return 0
    else
        warn "Criação de usuário cancelada."
        return 1
    fi
}

# =============================================================================
# VERIFICAÇÃO DE PRÉ-REQUISITOS
# =============================================================================

check_prerequisites() {
    log "Verificando pré-requisitos..."
    
    # Verificar se está rodando como root
    if [[ $EUID -ne 0 ]]; then
        error "Este script deve ser executado como root (use sudo)"
    fi
    
    # Verificar se o diretório do projeto existe
    if [[ ! -d "/opt/nowhats" ]]; then
        error "Diretório do projeto não encontrado: /opt/nowhats"
    fi
    
    # Verificar se Docker está instalado
    if ! command -v docker &> /dev/null; then
        error "Docker não está instalado"
    fi
    
    # Verificar se Docker Compose está instalado
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose não está instalado"
    fi
    
    log "✅ Pré-requisitos verificados"
}

# =============================================================================
# FUNÇÃO PRINCIPAL
# =============================================================================

main() {
    # Verificar pré-requisitos
    check_prerequisites
    
    # Executar assistente
    admin_setup_wizard
}

# Executar se chamado diretamente
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi