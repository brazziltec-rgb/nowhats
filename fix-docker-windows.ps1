# Script de Diagnóstico e Correção do Docker no Windows
# Este script verifica e corrige problemas comuns do Docker Desktop no Windows

Write-Host "=== NoWhats - Diagnóstico Docker Windows ===" -ForegroundColor Cyan
Write-Host ""

# Função para verificar se o Docker Desktop está rodando
function Test-DockerRunning {
    try {
        $result = docker ps 2>$null
        return $LASTEXITCODE -eq 0
    }
    catch {
        return $false
    }
}

# Função para iniciar Docker Desktop
function Start-DockerDesktop {
    Write-Host "Iniciando Docker Desktop..." -ForegroundColor Yellow
    
    $dockerPath = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    
    if (Test-Path $dockerPath) {
        Start-Process $dockerPath
        Write-Host "Docker Desktop iniciado. Aguardando inicialização..." -ForegroundColor Green
        
        # Aguarda até 60 segundos para o Docker inicializar
        $timeout = 60
        $elapsed = 0
        
        while ($elapsed -lt $timeout) {
            Start-Sleep -Seconds 5
            $elapsed += 5
            
            if (Test-DockerRunning) {
                Write-Host "Docker Desktop está rodando!" -ForegroundColor Green
                return $true
            }
            
            Write-Host "Aguardando Docker Desktop... ($elapsed/$timeout segundos)" -ForegroundColor Yellow
        }
        
        Write-Host "Timeout: Docker Desktop não inicializou em $timeout segundos" -ForegroundColor Red
        return $false
    }
    else {
        Write-Host "Docker Desktop não encontrado em: $dockerPath" -ForegroundColor Red
        Write-Host "Por favor, instale o Docker Desktop primeiro." -ForegroundColor Red
        return $false
    }
}

# 1. Verificar se Docker está instalado
Write-Host "1. Verificando instalação do Docker..." -ForegroundColor Blue
try {
    $dockerVersion = docker --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Docker instalado: $dockerVersion" -ForegroundColor Green
    }
    else {
        Write-Host "[ERROR] Docker não está instalado" -ForegroundColor Red
        Write-Host "Por favor, instale o Docker Desktop primeiro." -ForegroundColor Red
        exit 1
    }
}
catch {
    Write-Host "[ERROR] Docker não está instalado" -ForegroundColor Red
    Write-Host "Por favor, instale o Docker Desktop primeiro." -ForegroundColor Red
    exit 1
}

# 2. Verificar se Docker está rodando
Write-Host "`n2. Verificando se Docker está rodando..." -ForegroundColor Blue
if (Test-DockerRunning) {
    Write-Host "[OK] Docker está rodando" -ForegroundColor Green
}
else {
    Write-Host "[ERROR] Docker não está rodando" -ForegroundColor Red
    
    # Tentar iniciar Docker Desktop
    if (Start-DockerDesktop) {
        Write-Host "[OK] Docker Desktop iniciado com sucesso" -ForegroundColor Green
    }
    else {
        Write-Host "[ERROR] Falha ao iniciar Docker Desktop" -ForegroundColor Red
        Write-Host "Por favor, inicie o Docker Desktop manualmente." -ForegroundColor Yellow
        exit 1
    }
}

# 3. Verificar containers
Write-Host "`n3. Verificando containers..." -ForegroundColor Blue
try {
    $containers = docker ps -a --format "table {{.Names}}\t{{.State}}\t{{.Status}}" 2>$null
    
    if ($containers -and $containers.Count -gt 1) {
        Write-Host "[OK] Containers encontrados:" -ForegroundColor Green
        Write-Host $containers
    }
    else {
        Write-Host "[ERROR] Nenhum container encontrado" -ForegroundColor Red
        Write-Host "Iniciando containers..." -ForegroundColor Yellow
        
        docker-compose -f docker-compose.prod.yml up -d
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[OK] Containers iniciados" -ForegroundColor Green
        }
        else {
            Write-Host "[ERROR] Falha ao iniciar containers" -ForegroundColor Red
        }
    }
}
catch {
    Write-Host "[ERROR] Erro ao verificar containers" -ForegroundColor Red
}

# 4. Verificar acesso à aplicação
Write-Host "`n4. Verificando acesso à aplicação..." -ForegroundColor Blue
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 10 -UseBasicParsing 2>$null
    if ($response.StatusCode -eq 200) {
        Write-Host "[OK] Aplicação acessível em http://localhost:3000" -ForegroundColor Green
    }
    else {
        Write-Host "[ERROR] Aplicação não está respondendo" -ForegroundColor Red
    }
}
catch {
    Write-Host "[ERROR] Aplicação não está acessível" -ForegroundColor Red
    Write-Host "Aguarde alguns minutos para os containers inicializarem completamente" -ForegroundColor Yellow
}

Write-Host "`n=== Diagnóstico Concluído ===" -ForegroundColor Cyan
Write-Host "`nURLs de Acesso:" -ForegroundColor Yellow
Write-Host "• Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "• Backend: http://localhost:3006" -ForegroundColor White
Write-Host "• Evolution API: http://localhost:8080" -ForegroundColor White
Write-Host "• Baileys API: http://localhost:3001" -ForegroundColor White
Write-Host "• WebJS API: http://localhost:3003" -ForegroundColor White

Write-Host "`nComandos Úteis:" -ForegroundColor Yellow
Write-Host "• Ver logs: docker-compose -f docker-compose.prod.yml logs" -ForegroundColor White
Write-Host "• Reiniciar: docker-compose -f docker-compose.prod.yml restart" -ForegroundColor White
Write-Host "• Parar: docker-compose -f docker-compose.prod.yml down" -ForegroundColor White