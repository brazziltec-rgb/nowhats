# Soluções para Problemas de Docker

Este documento contém soluções para resolver problemas comuns do Docker no Ubuntu e Windows.

## Problema Comum

Quando você vê este erro:
```
permission denied while trying to connect to the Docker daemon socket at unix:///var/run/docker.sock
```

Isso significa que seu usuário não tem permissão para acessar o Docker daemon.

## Soluções Disponíveis

### 1. Correção Automática Simples (Recomendada)

```bash
# Torna o script executável
chmod +x fix-docker-simple.sh

# Executa a correção
./fix-docker-simple.sh
```

Este script:
- ✅ Verifica se Docker está instalado
- ✅ Inicia o serviço Docker
- ✅ Adiciona seu usuário ao grupo docker
- ✅ Testa se Docker funciona
- ✅ Inicia NoWhats automaticamente
- ✅ Funciona com ou sem sudo

### 2. Correção Completa (Para casos complexos)

```bash
# Torna o script executável
chmod +x fix-docker-permissions.sh

# Executa a correção
./fix-docker-permissions.sh
```

Este script faz uma correção mais detalhada com logs completos.

### 3. Correção Manual

Se preferir fazer manualmente:

```bash
# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER

# Aplicar mudanças (escolha uma opção):
# Opção A: Aplicar na sessão atual
newgrp docker

# Opção B: Logout e login novamente
# Opção C: Reiniciar o sistema

# Testar Docker
docker --version
docker ps

# Iniciar NoWhats
docker-compose -f docker-compose.prod.yml up -d
```

## Verificação Rápida

Para verificar se Docker está funcionando:

```bash
# Testar comando básico
docker --version

# Testar acesso ao daemon
docker ps

# Ver containers do NoWhats
docker-compose -f docker-compose.prod.yml ps
```

## Solução de Emergência

Se nada funcionar, use sudo temporariamente:

```bash
# Parar containers
sudo docker-compose -f docker-compose.prod.yml down

# Iniciar com sudo
sudo docker-compose -f docker-compose.prod.yml up -d

# Verificar status
sudo docker ps
```

## Problemas Específicos

### Docker não inicia
```bash
# Verificar status
sudo systemctl status docker

# Reiniciar serviço
sudo systemctl restart docker

# Ver logs
sudo journalctl -u docker --no-pager -n 20
```

### Grupo docker não existe
```bash
# Criar grupo
sudo groupadd docker

# Adicionar usuário
sudo usermod -aG docker $USER
```

### Containers não iniciam
```bash
# Ver logs detalhados
docker-compose -f docker-compose.prod.yml logs

# Reconstruir containers
docker-compose -f docker-compose.prod.yml up -d --build
```

## Soluções para Windows

### Problema: Docker Desktop não está rodando

**Sintoma**: Erro `error during connect: Get "http://%2F%2F.%2Fpipe%2FdockerDesktopLinuxEngine/v1.51/containers/json"`

**Solução Automática**:
```powershell
# Execute o script de diagnóstico
.\fix-docker-windows.ps1
```

**Solução Manual**:
1. Abra o Docker Desktop manualmente
2. Aguarde a inicialização completa (ícone na bandeja do sistema)
3. Execute os containers:
```powershell
docker-compose -f docker-compose.prod.yml up -d
```

### Script de Diagnóstico Windows

O arquivo `fix-docker-windows.ps1` oferece:
- ✅ Verificação automática do Docker Desktop
- 🚀 Inicialização automática se necessário
- 📊 Diagnóstico completo dos containers
- 🔧 Correção automática de problemas comuns
- 📋 Relatório detalhado do status

## URLs de Acesso

Após correção bem-sucedida:

- 🌐 **Frontend**: http://localhost:3000
- 🔧 **Backend**: http://localhost:3006
- 📱 **Baileys API**: http://localhost:3001
- 🔄 **Evolution API**: http://localhost:3002
- 🕷️ **WebJS API**: http://localhost:3003

## Dicas Importantes

1. **Sempre execute os scripts de correção no diretório do projeto**
2. **Se usar sudo, lembre-se que os arquivos podem ficar com permissões de root**
3. **Após adicionar usuário ao grupo docker, logout/login é necessário**
4. **Em caso de dúvida, reinicie o sistema após as correções**

## Logs Úteis

### Linux/Ubuntu
```bash
# Logs do Docker
sudo journalctl -u docker --no-pager -n 20

# Logs dos containers
docker-compose -f docker-compose.prod.yml logs --tail=50

# Logs de um container específico
docker logs nowhats_backend --tail=20
```

### Windows (PowerShell)
```powershell
# Ver logs de todos os containers
docker-compose -f docker-compose.prod.yml logs

# Ver logs de um container específico
docker-compose -f docker-compose.prod.yml logs postgres
docker-compose -f docker-compose.prod.yml logs backend

# Seguir logs em tempo real
docker-compose -f docker-compose.prod.yml logs -f
```