#!/bin/bash
# =============================================================================
# NOWHATS - GERADOR DE ARQUIVO .ENV (LINUX/MAC)
# =============================================================================
# Este script gera um arquivo .env completo baseado no .env.example
# com valores apropriados para desenvolvimento local
# =============================================================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

echo -e "${GREEN}"
echo "🔧 NoWhats - Gerador de Arquivo .env"
echo "========================================="
echo -e "${NC}"

# Função para gerar senha aleatória
generate_password() {
    local length=${1:-32}
    if command -v openssl >/dev/null 2>&1; then
        openssl rand -base64 $((length * 3 / 4)) | tr -d "=+/" | cut -c1-$length
    else
        cat /dev/urandom | tr -dc 'a-zA-Z0-9!@#$%^&*' | fold -w $length | head -n 1
    fi
}

# Função para gerar chave JWT
generate_jwt_secret() {
    if command -v openssl >/dev/null 2>&1; then
        openssl rand -base64 64 | tr -d "=+/" | cut -c1-50
    else
        generate_password 50
    fi
}

# Verificar se .env já existe
if [ -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Arquivo .env já existe!${NC}"
    read -p "Deseja sobrescrever? (s/N): " overwrite
    if [[ ! "$overwrite" =~ ^[Ss]$ ]]; then
        echo -e "${RED}❌ Operação cancelada.${NC}"
        exit 1
    fi
    echo
fi

# Verificar se .env.example existe
if [ ! -f ".env.example" ]; then
    echo -e "${RED}❌ Arquivo .env.example não encontrado!${NC}"
    exit 1
fi

echo -e "${CYAN}📝 Gerando senhas e chaves seguras...${NC}"

# Gerar senhas e chaves
DB_PASSWORD=$(generate_password 24)
JWT_SECRET=$(generate_jwt_secret)
REDIS_PASSWORD=$(generate_password 24)
SESSION_SECRET=$(generate_password 32)
WEBHOOK_SECRET=$(generate_password 32)
BAILEYS_KEY=$(generate_password 32)
EVOLUTION_KEY=$(generate_password 32)
WEBJS_KEY=$(generate_password 32)

echo -e "${GREEN}🔑 Senhas geradas com sucesso!${NC}"
echo

# Ler o arquivo .env.example
ENV_CONTENT=$(cat .env.example)

# Substituir valores de exemplo por valores reais
ENV_CONTENT=$(echo "$ENV_CONTENT" | sed "s/NODE_ENV=production/NODE_ENV=development/g")
ENV_CONTENT=$(echo "$ENV_CONTENT" | sed "s/DB_NAME=nowhats/DB_NAME=nowhats/g")
ENV_CONTENT=$(echo "$ENV_CONTENT" | sed "s/DB_USER=nowhats/DB_USER=postgres/g")

# Substituir senhas e chaves
ENV_CONTENT=$(echo "$ENV_CONTENT" | sed "s/sua_senha_super_segura_aqui/$DB_PASSWORD/g")
ENV_CONTENT=$(echo "$ENV_CONTENT" | sed "s/sua_chave_jwt_super_secreta_aqui/$JWT_SECRET/g")
ENV_CONTENT=$(echo "$ENV_CONTENT" | sed "s/sua_senha_redis_aqui/$REDIS_PASSWORD/g")
ENV_CONTENT=$(echo "$ENV_CONTENT" | sed "s/sua_chave_sessao_super_secreta_aqui/$SESSION_SECRET/g")
ENV_CONTENT=$(echo "$ENV_CONTENT" | sed "s/sua_chave_webhook_super_secreta_aqui/$WEBHOOK_SECRET/g")
ENV_CONTENT=$(echo "$ENV_CONTENT" | sed "s/sua_chave_baileys_aqui/$BAILEYS_KEY/g")
ENV_CONTENT=$(echo "$ENV_CONTENT" | sed "s/sua_chave_evolution_aqui/$EVOLUTION_KEY/g")
ENV_CONTENT=$(echo "$ENV_CONTENT" | sed "s/sua_chave_webjs_aqui/$WEBJS_KEY/g")

# URLs para desenvolvimento local
ENV_CONTENT=$(echo "$ENV_CONTENT" | sed "s|https://seudominio.com|http://localhost:3000|g")
ENV_CONTENT=$(echo "$ENV_CONTENT" | sed "s/seudominio.com/localhost/g")

# Configurações de desenvolvimento
ENV_CONTENT=$(echo "$ENV_CONTENT" | sed "s/DEBUG=false/DEBUG=true/g")
ENV_CONTENT=$(echo "$ENV_CONTENT" | sed "s/LOG_LEVEL=info/LOG_LEVEL=debug/g")
ENV_CONTENT=$(echo "$ENV_CONTENT" | sed "s/SECURE_COOKIES=true/SECURE_COOKIES=false/g")
ENV_CONTENT=$(echo "$ENV_CONTENT" | sed "s/HTTPS_REDIRECT=true/HTTPS_REDIRECT=false/g")
ENV_CONTENT=$(echo "$ENV_CONTENT" | sed "s/SAME_SITE=strict/SAME_SITE=lax/g")

# Ajustar URLs das APIs para Docker
ENV_CONTENT=$(echo "$ENV_CONTENT" | sed "s|http://baileys:3001|http://baileys-api:3001|g")
ENV_CONTENT=$(echo "$ENV_CONTENT" | sed "s|http://evolution:8080|http://evolution-api:8080|g")
ENV_CONTENT=$(echo "$ENV_CONTENT" | sed "s|http://webjs:3002|http://webjs-api:3003|g")

# Ajustar DATABASE_URL
DATABASE_URL="postgresql://postgres:$DB_PASSWORD@postgres:5432/nowhats"
ENV_CONTENT=$(echo "$ENV_CONTENT" | sed "s|postgresql://nowhats:sua_senha_super_segura_aqui@postgres:5432/nowhats|$DATABASE_URL|g")

# Ajustar REDIS_URL
REDIS_URL="redis://:$REDIS_PASSWORD@redis:6379"
ENV_CONTENT=$(echo "$ENV_CONTENT" | sed "s|redis://:sua_senha_redis_aqui@redis:6379|$REDIS_URL|g")

echo -e "${CYAN}💾 Salvando arquivo .env...${NC}"

# Salvar o arquivo .env
echo "$ENV_CONTENT" > .env

echo -e "${GREEN}✅ Arquivo .env criado com sucesso!${NC}"
echo
echo -e "${YELLOW}📋 Resumo das configurações:${NC}"
echo -e "${WHITE}  • Ambiente: Desenvolvimento${NC}"
echo -e "${WHITE}  • Banco: PostgreSQL (nowhats)${NC}"
echo -e "${WHITE}  • Usuário DB: postgres${NC}"
echo -e "${WHITE}  • Frontend: http://localhost:3000${NC}"
echo -e "${WHITE}  • Backend: http://localhost:3006${NC}"
echo -e "${WHITE}  • Debug: Ativado${NC}"
echo
echo -e "${YELLOW}🔐 Senhas geradas automaticamente:${NC}"
echo -e "${WHITE}  • Senha do PostgreSQL: ${DB_PASSWORD:0:8}...${NC}"
echo -e "${WHITE}  • Chave JWT: ${JWT_SECRET:0:8}...${NC}"
echo -e "${WHITE}  • Senha do Redis: ${REDIS_PASSWORD:0:8}...${NC}"
echo
echo -e "${RED}⚠️  IMPORTANTE:${NC}"
echo -e "${WHITE}  • Nunca commite o arquivo .env no Git!${NC}"
echo -e "${WHITE}  • Mantenha as senhas em local seguro${NC}"
echo -e "${WHITE}  • Para produção, ajuste as URLs e configurações${NC}"
echo
echo -e "${GREEN}🚀 Próximos passos:${NC}"
echo -e "${WHITE}  1. Execute: docker-compose up -d${NC}"
echo -e "${WHITE}  2. Aguarde os containers iniciarem${NC}"
echo -e "${WHITE}  3. Acesse: http://localhost:3000${NC}"
echo

# Verificar se docker-compose.yml existe
if [ -f "docker-compose.yml" ]; then
    echo -e "${GREEN}🐳 Arquivo docker-compose.yml encontrado!${NC}"
    read -p "Deseja iniciar os containers agora? (s/N): " start_docker
    if [[ "$start_docker" =~ ^[Ss]$ ]]; then
        echo
        echo -e "${CYAN}🚀 Iniciando containers...${NC}"
        
        if docker-compose up -d; then
            echo -e "${GREEN}✅ Containers iniciados com sucesso!${NC}"
            echo -e "${YELLOW}📱 Acesse a aplicação em: http://localhost:3000${NC}"
        else
            echo -e "${RED}❌ Erro ao iniciar containers. Verifique os logs.${NC}"
        fi
    fi
else
    echo -e "${YELLOW}⚠️  Arquivo docker-compose.yml não encontrado.${NC}"
    echo -e "${WHITE}   Execute este script na raiz do projeto NoWhats.${NC}"
fi

echo