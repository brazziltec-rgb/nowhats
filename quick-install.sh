#!/bin/bash

# NoWhats - Instalação em 1 Comando
# Funciona para root ou usuário normal

set -e

echo "🚀 NoWhats - Instalação Rápida"

# Detectar se precisa de sudo
SUDO_CMD=""
if [[ $EUID -ne 0 ]]; then
    SUDO_CMD="sudo"
fi

# Instalar Docker (método universal)
echo "📦 Instalando Docker..."
$SUDO_CMD apt update -y
$SUDO_CMD apt install -y curl
curl -fsSL https://get.docker.com | $SUDO_CMD sh

# Adicionar usuário ao grupo docker
if [[ $EUID -eq 0 ]] && [[ -n "$SUDO_USER" ]]; then
    usermod -aG docker "$SUDO_USER"
else
    $SUDO_CMD usermod -aG docker "$USER"
fi

# Instalar Docker Compose
echo "🔨 Instalando Docker Compose..."
$SUDO_CMD curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
$SUDO_CMD chmod +x /usr/local/bin/docker-compose

# Configurar .env básico
echo "⚙️ Configurando .env..."
cat > .env << 'EOF'
# Configuração Básica NoWhats
NODE_ENV=production
PORT=3006
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3006

# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=nowhats
DB_USER=nowhats
DB_PASSWORD=nowhats123

# JWT
JWT_SECRET=minha-chave-secreta-jwt-2024
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:3000

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=redis123

# APIs WhatsApp
BAILEYS_PORT=3001
EVOLUTION_PORT=3002
WEBJS_PORT=3003

# Baileys
BAILEYS_API_KEY=baileys-api-key-2024

# Evolution
EVOLUTION_API_KEY=evolution-api-key-2024
EVOLUTION_AUTHENTICATION_TYPE=apikey
EVOLUTION_AUTHENTICATION_API_KEY=evolution-global-key-2024
EVOLUTION_AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES=true

# Web.js
WEBJS_API_KEY=webjs-api-key-2024
EOF

# Criar diretórios
echo "📁 Criando diretórios..."
mkdir -p data/{postgres,redis,sessions/{baileys,evolution,webjs},logs,uploads}

# Iniciar Docker
echo "🐳 Iniciando Docker..."
$SUDO_CMD systemctl enable docker
$SUDO_CMD systemctl start docker
sleep 3

# Executar aplicação
echo "🚀 Iniciando NoWhats..."
if [[ -f "docker-compose.prod.yml" ]]; then
    docker-compose -f docker-compose.prod.yml up -d
else
    docker-compose up -d
fi

echo "⏳ Aguardando containers..."
sleep 20

echo "📊 Status dos containers:"
docker ps

echo ""
echo "✅ NoWhats instalado!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend:  http://localhost:3006"
echo ""
echo "💡 Se der erro de permissão do Docker:"
echo "   Execute: newgrp docker"
echo "   Ou faça logout/login"