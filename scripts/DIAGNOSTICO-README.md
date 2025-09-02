# Scripts de Diagnóstico e Correção de Problemas de Autenticação

Este diretório contém scripts para diagnosticar e resolver problemas comuns de autenticação no Nowhats, incluindo rate limiting e erros de token.

## Scripts Disponíveis

### 1. fix-auth-issues.sh (Linux/macOS)
**Localização:** `scripts/fix-auth-issues.sh`

### 2. fix-auth-issues.ps1 (Windows)
**Localização:** `scripts/fix-auth-issues.ps1`

## Problemas que os Scripts Resolvem

- ✅ **Rate Limiting Excessivo**: "Muitas tentativas de login. Tente novamente em 15 minutos"
- ✅ **Erro de Verificação de Autenticação**: Tokens inválidos ou expirados
- ✅ **Containers não Respondendo**: Backend ou Redis com problemas
- ✅ **Configuração de Ambiente**: Variáveis críticas não configuradas
- ✅ **Conectividade da API**: Problemas de comunicação entre frontend e backend

## Como Usar

### No Windows (PowerShell)

```powershell
# Navegar até o diretório do projeto
cd "C:\caminho\para\seu\projeto\nowhats"

# Executar o script (modo interativo)
.\scripts\fix-auth-issues.ps1

# Ou executar ações específicas:
.\scripts\fix-auth-issues.ps1 -Action "1"  # Diagnóstico
.\scripts\fix-auth-issues.ps1 -Action "2"  # Limpar rate limiting
.\scripts\fix-auth-issues.ps1 -Action "6"  # Executar tudo
```

### No Linux/macOS (Bash)

```bash
# Navegar até o diretório do projeto
cd /caminho/para/seu/projeto/nowhats

# Dar permissão de execução (primeira vez)
chmod +x scripts/fix-auth-issues.sh

# Executar o script (modo interativo)
./scripts/fix-auth-issues.sh

# Ou executar ações específicas:
./scripts/fix-auth-issues.sh 1  # Diagnóstico
./scripts/fix-auth-issues.sh 2  # Limpar rate limiting
./scripts/fix-auth-issues.sh 6  # Executar tudo
```

## Opções do Menu

| Opção | Descrição | Quando Usar |
|-------|-----------|-------------|
| **1** | Diagnóstico completo | Quando não souber qual é o problema |
| **2** | Limpar rate limiting | Quando receber erro "Muitas tentativas de login" |
| **3** | Verificar variáveis de ambiente | Quando suspeitar de problemas de configuração |
| **4** | Testar autenticação | Para verificar se a API está funcionando |
| **5** | Mostrar informações úteis | Para ver status geral e comandos úteis |
| **6** | Executar tudo | Para resolver múltiplos problemas de uma vez |

## Cenários Comuns de Uso

### 🚨 Erro: "Muitas tentativas de login"

```bash
# Execute a opção 2 para limpar o rate limiting
./scripts/fix-auth-issues.sh 2
```

### 🚨 Erro: "Erro ao verificar autenticação"

```bash
# Execute diagnóstico completo primeiro
./scripts/fix-auth-issues.sh 1

# Se necessário, limpe o rate limiting
./scripts/fix-auth-issues.sh 2

# Teste a autenticação
./scripts/fix-auth-issues.sh 4
```

### 🚨 Aplicação não está funcionando

```bash
# Execute tudo para diagnóstico e correção completa
./scripts/fix-auth-issues.sh 6
```

## O que os Scripts Fazem

### Diagnóstico (Opção 1)
- ✅ Verifica se os containers estão rodando
- ✅ Analisa logs do backend e Redis
- ✅ Testa conectividade com a API
- ✅ Identifica problemas comuns

### Limpeza de Rate Limiting (Opção 2)
- 🧹 Limpa cache do Redis (se disponível)
- 🔄 Reinicia o backend para limpar rate limiting em memória
- ⏱️ Aguarda o backend inicializar completamente
- ✅ Verifica se o backend está respondendo

### Verificação de Ambiente (Opção 3)
- 📋 Verifica se o arquivo `.env` existe
- 🔑 Valida variáveis críticas (JWT_SECRET, DB_PASSWORD, etc.)
- ⚠️ Alerta sobre configurações incorretas

### Teste de Autenticação (Opção 4)
- 🧪 Testa endpoint de health da API
- 🔒 Verifica se o rate limiting está funcionando normalmente
- 📊 Mostra status atual da autenticação

## Pré-requisitos

- ✅ Docker e Docker Compose instalados
- ✅ Projeto Nowhats configurado
- ✅ Arquivo `docker-compose.yml` no diretório raiz
- ✅ Permissões adequadas para executar scripts

## Solução de Problemas dos Scripts

### Script não executa (Windows)
```powershell
# Verificar política de execução
Get-ExecutionPolicy

# Se necessário, permitir execução de scripts
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Script não executa (Linux/macOS)
```bash
# Dar permissão de execução
chmod +x scripts/fix-auth-issues.sh

# Verificar se o arquivo existe
ls -la scripts/fix-auth-issues.sh
```

### Docker não está rodando
```bash
# Linux/macOS
sudo systemctl start docker

# Windows
# Iniciar Docker Desktop
```

## Logs e Debugging

Os scripts mostram logs coloridos para facilitar a identificação de problemas:

- 🟢 **Verde**: Operações bem-sucedidas
- 🟡 **Amarelo**: Avisos e informações importantes
- 🔴 **Vermelho**: Erros que precisam de atenção
- 🔵 **Azul**: Informações gerais

## Comandos Úteis Adicionais

```bash
# Ver logs em tempo real
docker-compose logs -f backend
docker-compose logs -f frontend

# Reiniciar serviços específicos
docker-compose restart backend
docker-compose restart redis

# Recriar containers (último recurso)
docker-compose down
docker-compose up -d

# Verificar status dos containers
docker-compose ps

# Verificar uso de recursos
docker stats
```

## Suporte

Se os scripts não resolverem o problema:

1. 📋 Execute o diagnóstico completo e anote os erros
2. 📝 Verifique os logs detalhados: `docker-compose logs`
3. 🔧 Verifique o arquivo `.env` e as configurações
4. 🔄 Tente recriar os containers: `docker-compose down && docker-compose up -d`
5. 📞 Entre em contato com o suporte técnico com os logs coletados

---

**Nota**: Estes scripts são seguros e não modificam dados da aplicação, apenas limpam caches e reiniciam serviços quando necessário.