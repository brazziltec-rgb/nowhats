#!/bin/bash

# NoWhats - Correção Simples Docker
# Solução rápida para problemas de permissão

set -e

echo "🔧 NoWhats - Correção Simples Docker"
echo "==================================="

# Função para testar Docker
test_docker() {
    if docker --version > /dev/null 2>&1 && docker ps > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Detectar se precisa de sudo
SUDO_CMD=""
if [[ $EUID -ne 0 ]]; then
    SUDO_CMD="sudo"
fi

echo "📋 Verificando Docker..."

# Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não instalado. Instalando..."
    curl -fsSL https://get.docker.com | $SUDO_CMD sh
fi

# Iniciar Docker
echo "🔄 Iniciando Docker..."
$SUDO_CMD systemctl enable docker 2>/dev/null || true
$SUDO_CMD systemctl start docker 2>/dev/null || true
sleep 3

# Adicionar usuário ao grupo docker
echo "👤 Configurando permissões..."
if [[ $EUID -eq 0 ]] && [[ -n "$SUDO_USER" ]]; then
    usermod -aG docker "$SUDO_USER" 2>/dev/null || true
    CURRENT_USER="$SUDO_USER"
else
    $SUDO_CMD usermod -aG docker "$USER" 2>/dev/null || true
    CURRENT_USER="$USER"
fi

# Testar se Docker funciona
echo "🧪 Testando Docker..."
if test_docker; then
    echo "✅ Docker funcionando!"
else
    echo "⚠️ Docker precisa de sudo. Tentando com sudo..."
    
    # Verificar se funciona com sudo
    if $SUDO_CMD docker ps > /dev/null 2>&1; then
        echo "✅ Docker funciona com sudo"
        echo "🚀 Iniciando NoWhats com sudo..."
        
        # Parar containers existentes
        $SUDO_CMD docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
        
        # Iniciar com sudo
        $SUDO_CMD docker-compose -f docker-compose.prod.yml up -d
        
        echo "⏳ Aguardando containers..."
        sleep 20
        
        echo "📊 Status dos containers:"
        $SUDO_CMD docker ps
        
        echo ""
        echo "✅ NoWhats iniciado com sudo!"
        echo "🌐 Frontend: http://localhost:3000"
        echo "🔧 Backend:  http://localhost:3006"
        echo ""
        echo "💡 Para usar Docker sem sudo no futuro:"
        echo "   1. Faça logout e login"
        echo "   2. Ou execute: newgrp docker"
        echo "   3. Ou reinicie o sistema"
        
        exit 0
    else
        echo "❌ Docker não funciona nem com sudo"
        echo "🔄 Tentando reiniciar Docker..."
        $SUDO_CMD systemctl restart docker
        sleep 5
        
        if $SUDO_CMD docker ps > /dev/null 2>&1; then
            echo "✅ Docker funcionando após restart"
        else
            echo "❌ Problema persistente com Docker"
            echo "📋 Logs do Docker:"
            $SUDO_CMD journalctl -u docker --no-pager -n 10
            exit 1
        fi
    fi
fi

echo "🚀 Iniciando NoWhats..."

# Parar containers existentes
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true

# Iniciar aplicação
docker-compose -f docker-compose.prod.yml up -d

echo "⏳ Aguardando containers..."
sleep 20

echo "📊 Status dos containers:"
docker ps

echo ""
echo "✅ NoWhats iniciado!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend:  http://localhost:3006"
echo ""
echo "💡 Se houver problemas futuros:"
echo "   Execute: ./fix-docker-simple.sh"