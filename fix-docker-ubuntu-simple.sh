#!/bin/bash

# NoWhats - Correção Rápida Ubuntu
# Foca nos problemas mais comuns que impedem containers de iniciar

set -e

echo "🔧 NoWhats - Correção Rápida Ubuntu"
echo "==================================="

# Detectar sudo
SUDO_CMD=""
if [[ $EUID -ne 0 ]]; then
    SUDO_CMD="sudo"
fi

# Função para verificar se comando funcionou
check_command() {
    if $1 &>/dev/null; then
        echo "✅ $2"
        return 0
    else
        echo "❌ $2"
        return 1
    fi
}

echo "1. Verificando Docker..."
if ! command -v docker &> /dev/null; then
    echo "⚠️  Docker não instalado, instalando..."
    curl -fsSL https://get.docker.com | $SUDO_CMD sh
    $SUDO_CMD usermod -aG docker $USER
fi

echo "2. Iniciando serviço Docker..."
$SUDO_CMD systemctl enable docker
$SUDO_CMD systemctl start docker
sleep 2

echo "3. Testando acesso ao Docker..."
if ! docker ps &>/dev/null; then
    echo "⚠️  Problema de permissão, corrigindo..."
    
    # Verificar se usuário está no grupo
    if ! groups $USER | grep -q docker; then
        echo "Adicionando usuário ao grupo docker..."
        $SUDO_CMD usermod -aG docker $USER
    fi
    
    # Tentar corrigir permissões do socket
    echo "Corrigindo permissões do socket..."
    $SUDO_CMD chmod 666 /var/run/docker.sock 2>/dev/null || true
    
    # Testar novamente
    if ! docker ps &>/dev/null; then
        echo "⚠️  Ainda com problema, usando sudo temporariamente..."
        echo "IMPORTANTE: Faça logout/login após a instalação"
        
        # Criar alias temporário para usar sudo
        alias docker="$SUDO_CMD docker"
        alias docker-compose="$SUDO_CMD docker-compose"
    fi
fi

echo "4. Verificando Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    echo "Instalando Docker Compose..."
    $SUDO_CMD curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    $SUDO_CMD chmod +x /usr/local/bin/docker-compose
fi

echo "5. Preparando ambiente..."
# Criar .env se não existir
if [[ ! -f ".env" ]]; then
    echo "Criando arquivo .env..."
    cat > .env << 'EOF'
NODE_ENV=production
PORT=3006
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3006

DB_HOST=postgres
DB_PORT=5432
DB_NAME=nowhats
DB_USER=nowhats
DB_PASSWORD=nowhats123

JWT_SECRET=jwt-secret-nowhats-2024
JWT_EXPIRES_IN=7d

CORS_ORIGIN=http://localhost:3000

REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=redis123

BAILEYS_PORT=3001
EVOLUTION_PORT=8080
WEBJS_PORT=3003

BAILEYS_API_KEY=baileys-key-2024
EVOLUTION_API_KEY=evolution-key-2024
WEBJS_API_KEY=webjs-key-2024
EOF
fi

# Criar diretórios
mkdir -p data/{postgres,redis,sessions/{baileys,evolution,webjs},logs,uploads}

echo "6. Parando containers existentes..."
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true

echo "7. Limpando recursos Docker..."
docker system prune -f 2>/dev/null || true

echo "8. Iniciando containers..."
echo "⏳ Isso pode demorar alguns minutos na primeira vez..."

if docker-compose -f docker-compose.prod.yml up -d; then
    echo "✅ Containers iniciados"
else
    echo "❌ Falha ao iniciar containers"
    echo "📋 Logs dos containers:"
    docker-compose -f docker-compose.prod.yml logs
    
    echo ""
    echo "🔍 Diagnóstico rápido:"
    echo "1. Verificar se todas as imagens foram baixadas:"
    docker images
    
    echo ""
    echo "2. Verificar containers:"
    docker ps -a
    
    echo ""
    echo "3. Tentar iniciar um por vez:"
    echo "   docker-compose -f docker-compose.prod.yml up postgres"
    echo "   docker-compose -f docker-compose.prod.yml up redis"
    echo "   docker-compose -f docker-compose.prod.yml up backend"
    
    exit 1
fi

echo "9. Aguardando inicialização..."
sleep 30

echo "10. Status final:"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "🎉 Instalação concluída!"
echo ""
echo "📱 Acesse: http://localhost:3000"
echo ""
echo "📋 Comandos úteis:"
echo "   Ver logs: docker-compose -f docker-compose.prod.yml logs"
echo "   Reiniciar: docker-compose -f docker-compose.prod.yml restart"
echo "   Parar: docker-compose -f docker-compose.prod.yml down"
echo ""
echo "⚠️  Se houver problemas de permissão:"
echo "   1. Execute: newgrp docker"
echo "   2. Ou faça logout/login"
echo "   3. Ou reinicie o sistema"