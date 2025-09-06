# Script para corrigir problemas de permissão do arquivo .env no Windows
# Versão: 1.0
# Data: $(Get-Date -Format 'yyyy-MM-dd')

# Configurar política de execução se necessário
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force -ErrorAction SilentlyContinue

# Função para log colorido
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    } else {
        $input | Write-Output
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Log-Info($message) {
    Write-ColorOutput Blue "ℹ️  $message"
}

function Log-Success($message) {
    Write-ColorOutput Green "✅ $message"
}

function Log-Warning($message) {
    Write-ColorOutput Yellow "⚠️  $message"
}

function Log-Error($message) {
    Write-ColorOutput Red "❌ $message"
}

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "🔧 CORREÇÃO DE PERMISSÕES DO ARQUIVO .ENV" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host

# Verificar se estamos no diretório correto
if (-not (Test-Path "docker-compose.yml")) {
    Log-Error "Arquivo docker-compose.yml não encontrado!"
    Log-Info "Execute este script no diretório raiz do projeto NoWhats"
    exit 1
}

Log-Info "Verificando diretório atual: $(Get-Location)"

# Verificar se o arquivo .env existe
if (Test-Path ".env") {
    Log-Warning "Arquivo .env existe, verificando permissões..."
    
    # Tentar ler o arquivo para verificar permissões
    try {
        $content = Get-Content ".env" -ErrorAction Stop
        Log-Success "Arquivo .env é legível"
    } catch {
        Log-Warning "Problema ao ler arquivo .env: $($_.Exception.Message)"
    }
    
    # Tentar escrever no arquivo para verificar permissões
    try {
        Add-Content ".env" "" -ErrorAction Stop
        Log-Success "Arquivo .env tem permissões de escrita"
    } catch {
        Log-Warning "Arquivo .env sem permissão de escrita, tentando corrigir..."
        
        # Tentar remover atributos somente leitura
        try {
            Set-ItemProperty ".env" -Name IsReadOnly -Value $false -ErrorAction Stop
            Log-Success "Atributo somente leitura removido"
        } catch {
            Log-Warning "Não foi possível remover atributo somente leitura"
        }
        
        # Se ainda não conseguir escrever, remover e recriar
        try {
            Add-Content ".env" "" -ErrorAction Stop
        } catch {
            Log-Warning "Ainda sem permissão, removendo arquivo para recriar..."
            try {
                Remove-Item ".env" -Force -ErrorAction Stop
                Log-Success "Arquivo .env removido"
            } catch {
                Log-Error "Não foi possível remover o arquivo .env: $($_.Exception.Message)"
                exit 1
            }
        }
    }
}

# Se o arquivo não existe ou foi removido, criar novo
if (-not (Test-Path ".env")) {
    Log-Info "Criando novo arquivo .env..."
    
    # Verificar se .env.example existe
    if (Test-Path ".env.example") {
        Log-Info "Copiando de .env.example..."
        try {
            Copy-Item ".env.example" ".env" -ErrorAction Stop
            Log-Success "Arquivo copiado de .env.example"
        } catch {
            Log-Warning "Falha ao copiar .env.example: $($_.Exception.Message)"
            Log-Info "Criando arquivo básico..."
        }
    }
    
    # Se ainda não existe, criar arquivo básico
    if (-not (Test-Path ".env")) {
        Log-Info "Criando arquivo .env básico..."
        
        # Gerar senhas aleatórias
        $dbPass = -join ((1..25) | ForEach {Get-Random -Input ([char[]]([char]'a'..[char]'z') + ([char[]]([char]'A'..[char]'Z')) + ([char[]]([char]'0'..[char]'9')))})
        $jwtSecret = -join ((1..50) | ForEach {Get-Random -Input ([char[]]([char]'a'..[char]'z') + ([char[]]([char]'A'..[char]'Z')) + ([char[]]([char]'0'..[char]'9')))})
        $redisPass = -join ((1..25) | ForEach {Get-Random -Input ([char[]]([char]'a'..[char]'z') + ([char[]]([char]'A'..[char]'Z')) + ([char[]]([char]'0'..[char]'9')))})
        
        # Criar conteúdo do arquivo .env
        $envContent = @"
# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_NAME=nowhats
DB_USER=nowhats
DB_PASSWORD=$dbPass

# JWT Configuration
JWT_SECRET=$jwtSecret

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=$redisPass

# API URLs
BAILEYS_API_URL=http://baileys:3003
EVOLUTION_API_URL=http://evolution:8080
WEBJS_API_URL=http://webjs:3006

# Frontend Configuration
REACT_APP_API_URL=http://localhost:3001

# Environment
NODE_ENV=development
PORT=3001
"@
        
        try {
            Set-Content ".env" $envContent -Encoding UTF8 -ErrorAction Stop
            Log-Success "Arquivo .env criado com sucesso!"
        } catch {
            Log-Error "Falha ao criar arquivo .env: $($_.Exception.Message)"
            exit 1
        }
    }
}

# Verificar se o arquivo foi criado corretamente
if (Test-Path ".env") {
    try {
        $content = Get-Content ".env" -ErrorAction Stop
        Log-Success "Arquivo .env está funcionando corretamente!"
        
        Log-Info "Conteúdo do arquivo .env (senhas mascaradas):"
        Write-Host "----------------------------------------" -ForegroundColor Gray
        
        # Mostrar conteúdo mascarando senhas
        $content | ForEach-Object {
            if ($_ -match "PASSWORD=|SECRET=") {
                $_ -replace "(PASSWORD|SECRET)=.*", '$1=***HIDDEN***'
            } else {
                $_
            }
        } | Write-Host -ForegroundColor White
        
        Write-Host "----------------------------------------" -ForegroundColor Gray
        
        # Verificar propriedades do arquivo
        $fileInfo = Get-ItemProperty ".env"
        Log-Info "Propriedades do arquivo:"
        Write-Host "  Tamanho: $($fileInfo.Length) bytes" -ForegroundColor White
        Write-Host "  Criado: $($fileInfo.CreationTime)" -ForegroundColor White
        Write-Host "  Modificado: $($fileInfo.LastWriteTime)" -ForegroundColor White
        Write-Host "  Somente leitura: $($fileInfo.IsReadOnly)" -ForegroundColor White
        
    } catch {
        Log-Error "Problema ao verificar arquivo .env: $($_.Exception.Message)"
        exit 1
    }
} else {
    Log-Error "Problema persistente com o arquivo .env"
    exit 1
}

Write-Host
Log-Success "✨ Correção de permissões concluída!"
Log-Info "Agora você pode executar: docker-compose up -d"
Log-Info "Ou use o PowerShell: docker compose up -d"
Write-Host

# Pausa para o usuário ver o resultado
Write-Host "Pressione qualquer tecla para continuar..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")