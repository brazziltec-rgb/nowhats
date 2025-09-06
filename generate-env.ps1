#!/usr/bin/env pwsh
# =============================================================================
# NOWHATS - GERADOR DE ARQUIVO .ENV
# =============================================================================
# Este script gera um arquivo .env completo baseado no .env.example
# com valores apropriados para desenvolvimento local
# =============================================================================

Write-Host "" -ForegroundColor Green
Write-Host "🔧 NoWhats - Gerador de Arquivo .env" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""

# Função para gerar senha aleatória
function Generate-RandomPassword {
    param(
        [int]$Length = 32
    )
    $chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
    $password = ""
    for ($i = 0; $i -lt $Length; $i++) {
        $password += $chars[(Get-Random -Maximum $chars.Length)]
    }
    return $password
}

# Função para gerar chave JWT
function Generate-JWTSecret {
    $bytes = New-Object byte[] 64
    [System.Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
    return [Convert]::ToBase64String($bytes) -replace '[+/=]', ''
}

# Verificar se .env já existe
if (Test-Path ".env") {
    Write-Host "⚠️  Arquivo .env já existe!" -ForegroundColor Yellow
    $overwrite = Read-Host "Deseja sobrescrever? (s/N)"
    if ($overwrite -ne "s" -and $overwrite -ne "S") {
        Write-Host "❌ Operação cancelada." -ForegroundColor Red
        exit 1
    }
    Write-Host ""
}

# Verificar se .env.example existe
if (-not (Test-Path ".env.example")) {
    Write-Host "❌ Arquivo .env.example não encontrado!" -ForegroundColor Red
    exit 1
}

Write-Host "📝 Gerando senhas e chaves seguras..." -ForegroundColor Cyan

# Gerar senhas e chaves
$dbPassword = Generate-RandomPassword -Length 24
$jwtSecret = Generate-JWTSecret
$redisPassword = Generate-RandomPassword -Length 24
$sessionSecret = Generate-RandomPassword -Length 32
$webhookSecret = Generate-RandomPassword -Length 32
$baileysKey = Generate-RandomPassword -Length 32
$evolutionKey = Generate-RandomPassword -Length 32
$webjsKey = Generate-RandomPassword -Length 32

Write-Host "🔑 Senhas geradas com sucesso!" -ForegroundColor Green
Write-Host ""

# Ler o arquivo .env.example
$envExample = Get-Content ".env.example" -Raw

# Substituir valores de exemplo por valores reais
$envContent = $envExample

# Configurações básicas para desenvolvimento local
$envContent = $envContent -replace "NODE_ENV=production", "NODE_ENV=development"
$envContent = $envContent -replace "DB_NAME=nowhats", "DB_NAME=nowhats"
$envContent = $envContent -replace "DB_USER=nowhats", "DB_USER=postgres"

# Substituir senhas e chaves
$envContent = $envContent -replace "sua_senha_super_segura_aqui", $dbPassword
$envContent = $envContent -replace "sua_chave_jwt_super_secreta_aqui", $jwtSecret
$envContent = $envContent -replace "sua_senha_redis_aqui", $redisPassword
$envContent = $envContent -replace "sua_chave_sessao_super_secreta_aqui", $sessionSecret
$envContent = $envContent -replace "sua_chave_webhook_super_secreta_aqui", $webhookSecret
$envContent = $envContent -replace "sua_chave_baileys_aqui", $baileysKey
$envContent = $envContent -replace "sua_chave_evolution_aqui", $evolutionKey
$envContent = $envContent -replace "sua_chave_webjs_aqui", $webjsKey

# URLs para desenvolvimento local
$envContent = $envContent -replace "https://seudominio.com", "http://localhost:3000"
$envContent = $envContent -replace "seudominio.com", "localhost"

# Configurações de desenvolvimento
$envContent = $envContent -replace "DEBUG=false", "DEBUG=true"
$envContent = $envContent -replace "LOG_LEVEL=info", "LOG_LEVEL=debug"
$envContent = $envContent -replace "SECURE_COOKIES=true", "SECURE_COOKIES=false"
$envContent = $envContent -replace "HTTPS_REDIRECT=true", "HTTPS_REDIRECT=false"
$envContent = $envContent -replace "SAME_SITE=strict", "SAME_SITE=lax"

# Ajustar URLs das APIs para Docker
$envContent = $envContent -replace "http://baileys:3001", "http://baileys-api:3001"
$envContent = $envContent -replace "http://evolution:8080", "http://evolution-api:8080"
$envContent = $envContent -replace "http://webjs:3002", "http://webjs-api:3003"

# Ajustar DATABASE_URL
$databaseUrl = "postgresql://postgres:$dbPassword@postgres:5432/nowhats"
$envContent = $envContent -replace "postgresql://nowhats:sua_senha_super_segura_aqui@postgres:5432/nowhats", $databaseUrl

# Ajustar REDIS_URL
$redisUrl = "redis://:$redisPassword@redis:6379"
$envContent = $envContent -replace "redis://:sua_senha_redis_aqui@redis:6379", $redisUrl

Write-Host "💾 Salvando arquivo .env..." -ForegroundColor Cyan

# Salvar o arquivo .env
$envContent | Out-File -FilePath ".env" -Encoding UTF8

Write-Host "✅ Arquivo .env criado com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Resumo das configurações:" -ForegroundColor Yellow
Write-Host "  • Ambiente: Desenvolvimento" -ForegroundColor White
Write-Host "  • Banco: PostgreSQL (nowhats)" -ForegroundColor White
Write-Host "  • Usuário DB: postgres" -ForegroundColor White
Write-Host "  • Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "  • Backend: http://localhost:3006" -ForegroundColor White
Write-Host "  • Debug: Ativado" -ForegroundColor White
Write-Host ""
Write-Host "🔐 Senhas geradas automaticamente:" -ForegroundColor Yellow
Write-Host "  • Senha do PostgreSQL: $($dbPassword.Substring(0,8))..." -ForegroundColor White
Write-Host "  • Chave JWT: $($jwtSecret.Substring(0,8))..." -ForegroundColor White
Write-Host "  • Senha do Redis: $($redisPassword.Substring(0,8))..." -ForegroundColor White
Write-Host ""
Write-Host "⚠️  IMPORTANTE:" -ForegroundColor Red
Write-Host "  • Nunca commite o arquivo .env no Git!" -ForegroundColor White
Write-Host "  • Mantenha as senhas em local seguro" -ForegroundColor White
Write-Host "  • Para produção, ajuste as URLs e configurações" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Próximos passos:" -ForegroundColor Green
Write-Host "  1. Execute: docker-compose up -d" -ForegroundColor White
Write-Host "  2. Aguarde os containers iniciarem" -ForegroundColor White
Write-Host "  3. Acesse: http://localhost:3000" -ForegroundColor White
Write-Host ""

# Verificar se docker-compose.yml existe
if (Test-Path "docker-compose.yml") {
    Write-Host "🐳 Arquivo docker-compose.yml encontrado!" -ForegroundColor Green
    $startDocker = Read-Host "Deseja iniciar os containers agora? (s/N)"
    if ($startDocker -eq "s" -or $startDocker -eq "S") {
        Write-Host ""
        Write-Host "🚀 Iniciando containers..." -ForegroundColor Cyan
        docker-compose up -d
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Containers iniciados com sucesso!" -ForegroundColor Green
            Write-Host "📱 Acesse a aplicação em: http://localhost:3000" -ForegroundColor Yellow
        } else {
            Write-Host "❌ Erro ao iniciar containers. Verifique os logs." -ForegroundColor Red
        }
    }
} else {
    Write-Host "⚠️  Arquivo docker-compose.yml não encontrado." -ForegroundColor Yellow
    Write-Host "   Execute este script na raiz do projeto NoWhats." -ForegroundColor White
}

Write-Host ""