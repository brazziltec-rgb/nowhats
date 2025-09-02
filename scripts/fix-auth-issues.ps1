# Script PowerShell para diagnosticar e resolver problemas de autenticação
# Autor: Sistema de Instalação Automática Nowhats
# Data: $(Get-Date -Format 'yyyy-MM-dd')

param(
    [string]$Action = "menu"
)

# Função para log colorido
function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "Info"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    
    switch ($Level) {
        "Success" { Write-Host "[$timestamp] ✓ $Message" -ForegroundColor Green }
        "Warning" { Write-Host "[$timestamp] ⚠ $Message" -ForegroundColor Yellow }
        "Error" { Write-Host "[$timestamp] ✗ $Message" -ForegroundColor Red }
        default { Write-Host "[$timestamp] $Message" -ForegroundColor Blue }
    }
}

# Verificar se Docker está rodando
function Test-DockerRunning {
    try {
        $null = docker info 2>$null
        return $true
    }
    catch {
        return $false
    }
}

# Verificar se estamos no diretório correto
function Test-ProjectDirectory {
    return Test-Path "docker-compose.yml"
}

# Função para diagnosticar problemas
function Invoke-DiagnoseAuthIssues {
    Write-Log "🔍 Diagnosticando problemas de autenticação..." "Info"
    
    # Verificar se os containers estão rodando
    Write-Log "Verificando status dos containers..." "Info"
    try {
        $containers = docker-compose ps
        if ($containers -match "Up") {
            Write-Log "Containers estão rodando" "Success"
        }
        else {
            Write-Log "Alguns containers não estão rodando" "Error"
            docker-compose ps
        }
    }
    catch {
        Write-Log "Erro ao verificar containers: $($_.Exception.Message)" "Error"
    }
    
    # Verificar logs do backend
    Write-Log "Verificando logs do backend (últimas 50 linhas)..." "Info"
    try {
        docker-compose logs --tail=50 backend
    }
    catch {
        Write-Log "Erro ao obter logs do backend: $($_.Exception.Message)" "Error"
    }
    
    # Verificar logs do Redis (se existir)
    $redisExists = docker-compose ps | Select-String "redis"
    if ($redisExists) {
        Write-Log "Verificando logs do Redis..." "Info"
        try {
            docker-compose logs --tail=20 redis
        }
        catch {
            Write-Log "Erro ao obter logs do Redis: $($_.Exception.Message)" "Error"
        }
    }
    
    # Verificar conectividade com backend
    Write-Log "Testando conectividade com backend..." "Info"
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -Method GET -TimeoutSec 10 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Log "Backend está respondendo" "Success"
        }
        else {
            Write-Log "Backend retornou status: $($response.StatusCode)" "Warning"
        }
    }
    catch {
        Write-Log "Backend não está respondendo: $($_.Exception.Message)" "Error"
    }
}

# Função para limpar rate limiting
function Clear-RateLimiting {
    Write-Log "🧹 Limpando rate limiting..." "Info"
    
    # Se estiver usando Redis para rate limiting
    $redisExists = docker-compose ps | Select-String "redis"
    if ($redisExists) {
        Write-Log "Limpando cache do Redis..." "Info"
        try {
            docker-compose exec -T redis redis-cli FLUSHALL
            Write-Log "Cache do Redis limpo" "Success"
        }
        catch {
            Write-Log "Erro ao limpar Redis: $($_.Exception.Message)" "Error"
        }
    }
    
    # Reiniciar o backend para limpar rate limiting em memória
    Write-Log "Reiniciando backend para limpar rate limiting em memória..." "Info"
    try {
        docker-compose restart backend
        Write-Log "Backend reiniciado" "Success"
    }
    catch {
        Write-Log "Erro ao reiniciar backend: $($_.Exception.Message)" "Error"
        return
    }
    
    # Aguardar o backend inicializar
    Write-Log "Aguardando backend inicializar..." "Info"
    Start-Sleep -Seconds 10
    
    # Verificar se o backend está respondendo
    $maxAttempts = 30
    $attempt = 1
    
    while ($attempt -le $maxAttempts) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -Method GET -TimeoutSec 5 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                Write-Log "Backend está respondendo na tentativa $attempt" "Success"
                break
            }
        }
        catch {
            # Continuar tentando
        }
        
        if ($attempt -eq $maxAttempts) {
            Write-Log "Backend não respondeu após $maxAttempts tentativas" "Error"
            return
        }
        
        Write-Log "Tentativa $attempt/$maxAttempts - aguardando..." "Info"
        Start-Sleep -Seconds 2
        $attempt++
    }
}

# Função para verificar variáveis de ambiente
function Test-Environment {
    Write-Log "🔧 Verificando variáveis de ambiente..." "Info"
    
    # Verificar se o arquivo .env existe
    if (-not (Test-Path ".env")) {
        Write-Log "Arquivo .env não encontrado" "Error"
        return
    }
    
    # Verificar variáveis críticas
    $requiredVars = @("JWT_SECRET", "JWT_REFRESH_SECRET", "DB_PASSWORD")
    $envContent = Get-Content ".env"
    
    foreach ($var in $requiredVars) {
        $line = $envContent | Where-Object { $_ -match "^$var=" }
        if ($line) {
            $value = ($line -split "=", 2)[1]
            if ($value -and $value -ne "your_secret_here") {
                Write-Log "$var está configurado" "Success"
            }
            else {
                Write-Log "$var não está configurado corretamente" "Error"
            }
        }
        else {
            Write-Log "$var não encontrado no .env" "Error"
        }
    }
}

# Função para testar autenticação
function Test-Authentication {
    Write-Log "🧪 Testando autenticação..." "Info"
    
    # Testar endpoint de health
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -Method GET -TimeoutSec 10 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Log "API está respondendo" "Success"
        }
        else {
            Write-Log "API retornou status: $($response.StatusCode)" "Error"
            return
        }
    }
    catch {
        Write-Log "API não está respondendo: $($_.Exception.Message)" "Error"
        return
    }
    
    # Testar rate limiting (deve permitir algumas tentativas)
    Write-Log "Testando rate limiting..." "Info"
    try {
        $body = @{
            email = "test@test.com"
            password = "test"
        } | ConvertTo-Json
        
        $response = Invoke-WebRequest -Uri "http://localhost:3001/api/auth/login" -Method POST -Body $body -ContentType "application/json" -ErrorAction SilentlyContinue
        
        switch ($response.StatusCode) {
            { $_ -in @(400, 401) } {
                Write-Log "Rate limiting está funcionando normalmente (HTTP $($response.StatusCode))" "Success"
            }
            429 {
                Write-Log "Rate limiting ainda está ativo (HTTP 429)" "Warning"
                Write-Log "Aguarde 15 minutos ou execute a limpeza novamente" "Info"
            }
            default {
                Write-Log "Resposta inesperada: HTTP $($response.StatusCode)" "Warning"
            }
        }
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq 429) {
            Write-Log "Rate limiting ainda está ativo (HTTP 429)" "Warning"
            Write-Log "Aguarde 15 minutos ou execute a limpeza novamente" "Info"
        }
        elseif ($statusCode -in @(400, 401)) {
            Write-Log "Rate limiting está funcionando normalmente (HTTP $statusCode)" "Success"
        }
        else {
            Write-Log "Erro ao testar autenticação: $($_.Exception.Message)" "Error"
        }
    }
}

# Função para mostrar informações úteis
function Show-UsefulInfo {
    Write-Log "📋 Informações úteis:" "Info"
    
    Write-Host ""
    Write-Host "🔗 URLs de acesso:" -ForegroundColor Cyan
    Write-Host "   Frontend: http://localhost:3000" -ForegroundColor White
    Write-Host "   Backend API: http://localhost:3001/api" -ForegroundColor White
    Write-Host "   Health Check: http://localhost:3001/api/health" -ForegroundColor White
    
    Write-Host ""
    Write-Host "📊 Status dos containers:" -ForegroundColor Cyan
    try {
        docker-compose ps
    }
    catch {
        Write-Log "Erro ao obter status dos containers: $($_.Exception.Message)" "Error"
    }
    
    Write-Host ""
    Write-Host "🛠️ Comandos úteis:" -ForegroundColor Cyan
    Write-Host "   Ver logs do backend: docker-compose logs -f backend" -ForegroundColor White
    Write-Host "   Ver logs do frontend: docker-compose logs -f frontend" -ForegroundColor White
    Write-Host "   Reiniciar serviços: docker-compose restart" -ForegroundColor White
    Write-Host "   Parar tudo: docker-compose down" -ForegroundColor White
    Write-Host "   Iniciar tudo: docker-compose up -d" -ForegroundColor White
    
    Write-Host ""
    Write-Host "🔧 Para problemas persistentes:" -ForegroundColor Cyan
    Write-Host "   1. Verifique o arquivo .env" -ForegroundColor White
    Write-Host "   2. Verifique os logs: docker-compose logs" -ForegroundColor White
    Write-Host "   3. Reinicie os containers: docker-compose restart" -ForegroundColor White
    Write-Host "   4. Se necessário, recrie os containers: docker-compose down && docker-compose up -d" -ForegroundColor White
}

# Função principal
function Main {
    Write-Host "=" * 60 -ForegroundColor Cyan
    Write-Host "🔧 DIAGNÓSTICO E CORREÇÃO DE PROBLEMAS DE AUTENTICAÇÃO" -ForegroundColor Cyan
    Write-Host "=" * 60 -ForegroundColor Cyan
    Write-Host ""
    
    # Verificar se Docker está rodando
    if (-not (Test-DockerRunning)) {
        Write-Log "Docker não está rodando. Inicie o Docker primeiro." "Error"
        return
    }
    
    # Verificar se estamos no diretório correto
    if (-not (Test-ProjectDirectory)) {
        Write-Log "docker-compose.yml não encontrado. Execute este script no diretório raiz do projeto." "Error"
        return
    }
    
    # Menu de opções
    if ($Action -eq "menu") {
        Write-Host "Escolha uma opção:" -ForegroundColor Yellow
        Write-Host "1) Diagnóstico completo" -ForegroundColor White
        Write-Host "2) Limpar rate limiting" -ForegroundColor White
        Write-Host "3) Verificar variáveis de ambiente" -ForegroundColor White
        Write-Host "4) Testar autenticação" -ForegroundColor White
        Write-Host "5) Mostrar informações úteis" -ForegroundColor White
        Write-Host "6) Executar tudo (diagnóstico + limpeza + teste)" -ForegroundColor White
        Write-Host "0) Sair" -ForegroundColor White
        Write-Host ""
        $choice = Read-Host "Digite sua escolha [0-6]"
    }
    else {
        $choice = $Action
    }
    
    switch ($choice) {
        "1" {
            Invoke-DiagnoseAuthIssues
        }
        "2" {
            Clear-RateLimiting
        }
        "3" {
            Test-Environment
        }
        "4" {
            Test-Authentication
        }
        "5" {
            Show-UsefulInfo
        }
        "6" {
            Invoke-DiagnoseAuthIssues
            Write-Host ""
            Test-Environment
            Write-Host ""
            Clear-RateLimiting
            Write-Host ""
            Test-Authentication
            Write-Host ""
            Show-UsefulInfo
        }
        "0" {
            Write-Log "Saindo..." "Info"
            return
        }
        default {
            Write-Log "Opção inválida" "Error"
            return
        }
    }
    
    Write-Host ""
    Write-Log "Operação concluída!" "Success"
}

# Executar função principal
Main