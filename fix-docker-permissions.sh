#!/bin/bash

# NoWhats - Correção de Permissões Docker
# Resolve problemas de permissão do Docker daemon socket

set -e

echo "🔧 NoWhats - Correção de Permissões Docker"
echo "=========================================="

# Verificar se está rodando no Ubuntu/Debian
if ! command -v apt &> /dev/null; then
    echo "❌ Este script é para sistemas Ubuntu/Debian"
    exit 1
fi

# Detectar se precisa de sudo
SUDO_CMD=""
if [[ $EUID -ne 0 ]]; then
    SUDO_CMD="sudo"
fi

echo "📋 Verificando status atual do Docker..."

# Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não está instalado. Execute primeiro o quick-install.sh"
    exit 1
fi

# Verificar se Docker está rodando
if ! $SUDO_CMD systemctl is-active --quiet docker; then
    echo "🔄 Iniciando serviço Docker..."
    $SUDO_CMD systemctl enable docker
    $SUDO_CMD systemctl start docker
    sleep 3
fi

echo "👤 Configurando permissões do usuário..."

# Adicionar usuário ao grupo docker
if [[ $EUID -eq 0 ]] && [[ -n "$SUDO_USER" ]]; then
    # Executando como root via sudo
    usermod -aG docker "$SUDO_USER"
    echo "✅ Usuário $SUDO_USER adicionado ao grupo docker"
else
    # Executando como usuário normal
    $SUDO_CMD usermod -aG docker "$USER"
    echo "✅ Usuário $USER adicionado ao grupo docker"
fi

# Verificar se o grupo docker existe
if ! getent group docker > /dev/null 2>&1; then
    echo "⚠️ Grupo docker não existe. Criando..."
    $SUDO_CMD groupadd docker
fi

# Aplicar mudanças de grupo na sessão atual
echo "🔄 Aplicando mudanças de grupo..."
newgrp docker << 'EOFGROUP'

# Testar acesso ao Docker
echo "🧪 Testando acesso ao Docker..."
if docker --version > /dev/null 2>&1; then
    echo "✅ Docker funcionando!"
    docker --version
else
    echo "❌ Ainda há problemas com Docker"
    exit 1
fi

# Testar docker ps
if docker ps > /dev/null 2>&1; then
    echo "✅ Acesso ao Docker daemon OK!"
else
    echo "❌ Ainda sem acesso ao Docker daemon"
    echo "💡 Tente fazer logout/login ou reiniciar o sistema"
    exit 1
fi

echo "🚀 Tentando iniciar NoWhats..."

# Verificar se existe docker-compose.prod.yml
if [[ -f "docker-compose.prod.yml" ]]; then
    echo "📦 Usando docker-compose.prod.yml"
    docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
    docker-compose -f docker-compose.prod.yml up -d
else
    echo "📦 Usando docker-compose.yml"
    docker-compose down 2>/dev/null || true
    docker-compose up -d
fi

echo "⏳ Aguardando containers iniciarem..."
sleep 20

echo "📊 Status dos containers:"
docker ps

echo ""
echo "✅ Correção concluída!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend:  http://localhost:3006"
echo ""
echo "💡 Se ainda houver problemas:"
echo "   1. Faça logout e login novamente"
echo "   2. Ou reinicie o sistema"
echo "   3. Execute: sudo systemctl restart docker"

EOFGROUP

echo ""
echo "⚠️ IMPORTANTE:"
echo "Se você ainda vê erros de permissão, execute:"
echo "   logout"
echo "Ou reinicie o sistema para aplicar as mudanças de grupo."