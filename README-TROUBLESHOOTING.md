# 🔧 NoWhats - Guia de Solução de Problemas

Este guia contém ferramentas específicas para diagnosticar e corrigir problemas de instalação do NoWhats no Ubuntu.

## 🚨 Problema Comum

Se você está enfrentando este erro durante a instalação:

```
Error response from daemon: driver failed programming external connectivity
Container nowhats_postgres exited with code 1
permission denied while trying to connect to the Docker daemon socket
```

**Você está no lugar certo!** 🎯

## 🛠️ Ferramentas Disponíveis

### 1. 🔍 Diagnóstico Completo

**Arquivo:** `diagnose-containers.sh`

**Quando usar:**
- Quando não souber qual é o problema específico
- Para identificar qual container está falhando
- Para obter informações detalhadas sobre o sistema

**Como usar:**
```bash
chmod +x diagnose-containers.sh
./diagnose-containers.sh
```

**O que faz:**
- ✅ Verifica dependências (Docker, Docker Compose)
- ✅ Analisa recursos do sistema (memória, disco)
- ✅ Verifica arquivos necessários (.env, diretórios)
- ✅ Testa portas em uso
- ✅ Examina cada container individualmente
- ✅ Mostra logs específicos de containers com problema
- ✅ Fornece sugestões de correção personalizadas

### 2. 🔧 Correção Automática Completa

**Arquivo:** `fix-nowhats-ubuntu.sh`

**Quando usar:**
- Após executar o diagnóstico
- Quando souber que há problemas de permissão/configuração
- Para uma correção completa e automática

**Como usar:**
```bash
chmod +x fix-nowhats-ubuntu.sh
./fix-nowhats-ubuntu.sh
```

**O que faz:**
- 🛑 Para todos os containers com problema
- 🧹 Limpa recursos Docker órfãos e não utilizados
- 🔐 Corrige permissões Docker (grupo, socket)
- 🔄 Verifica e reinicia serviço Docker
- 📁 Cria todos os diretórios necessários
- ⚙️ Verifica e corrige arquivo .env (gera senhas se necessário)
- 🚀 Inicia containers na ordem correta:
  1. PostgreSQL (aguarda ficar saudável)
  2. Redis
  3. Demais serviços
- 🏥 Monitora healthchecks
- 🌐 Testa acesso às URLs da aplicação

## 📋 Fluxo Recomendado

### Para Problemas Novos:

1. **Execute o diagnóstico primeiro:**
   ```bash
   ./diagnose-containers.sh
   ```

2. **Analise a saída e identifique o problema**

3. **Execute a correção automática:**
   ```bash
   ./fix-nowhats-ubuntu.sh
   ```

4. **Se ainda houver problemas, execute o diagnóstico novamente**

### Para Problemas Recorrentes:

1. **Execute diretamente a correção:**
   ```bash
   ./fix-nowhats-ubuntu.sh
   ```

2. **Se falhar, execute o diagnóstico para detalhes:**
   ```bash
   ./diagnose-containers.sh
   ```

## 🎯 Problemas Específicos e Soluções

### Container PostgreSQL não inicia

**Sintomas:**
- `nowhats_postgres exited with code 1`
- Erro de healthcheck no PostgreSQL

**Solução automática:**
```bash
./fix-nowhats-ubuntu.sh
```

**Solução manual:**
```bash
# Remover dados corrompidos
sudo rm -rf data/postgres/*

# Recriar container
docker-compose -f docker-compose.prod.yml up -d postgres
```

### Problemas de Permissão Docker

**Sintomas:**
- `permission denied while trying to connect to the Docker daemon socket`
- `dial unix /var/run/docker.sock: connect: permission denied`

**Solução automática:**
```bash
./fix-nowhats-ubuntu.sh
```

**Solução manual:**
```bash
# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER

# Corrigir permissões do socket
sudo chmod 666 /var/run/docker.sock

# Aplicar mudanças
newgrp docker
```

### Conflitos de Porta

**Sintomas:**
- `port is already allocated`
- `bind: address already in use`

**Diagnóstico:**
```bash
./diagnose-containers.sh
```

**Solução manual:**
```bash
# Ver processos usando as portas
netstat -tulnp | grep :3000
netstat -tulnp | grep :5432

# Parar processo conflitante ou alterar porta no docker-compose
```

### Falta de Recursos

**Sintomas:**
- Containers param inesperadamente
- `OOMKilled` nos logs

**Diagnóstico:**
```bash
./diagnose-containers.sh
```

**Solução:**
```bash
# Limpar recursos Docker
docker system prune -f

# Ou usar correção automática
./fix-nowhats-ubuntu.sh
```

## 📊 Interpretando a Saída do Diagnóstico

### Status dos Containers:

- ✅ **running + healthy**: Container funcionando perfeitamente
- ⚠️ **running + starting**: Container iniciando (aguarde)
- ❌ **running + unhealthy**: Container com problema interno
- ❌ **exited**: Container parou (veja o código de saída)
- ⚠️ **created**: Container criado mas não iniciado
- ⚠️ **restarting**: Container reiniciando continuamente

### Códigos de Saída Comuns:

- **0**: Saída normal
- **1**: Erro geral
- **125**: Erro do Docker daemon
- **126**: Container não executável
- **127**: Container não encontrado
- **137**: Container morto por SIGKILL (falta de memória)

## 🆘 Quando Pedir Ajuda

Se após executar ambos os scripts o problema persistir:

1. **Execute o diagnóstico e salve a saída:**
   ```bash
   ./diagnose-containers.sh > diagnostico.txt 2>&1
   ```

2. **Execute a correção e salve a saída:**
   ```bash
   ./fix-nowhats-ubuntu.sh > correcao.txt 2>&1
   ```

3. **Colete logs específicos do container com problema:**
   ```bash
   docker-compose -f docker-compose.prod.yml logs postgres > postgres.log
   docker-compose -f docker-compose.prod.yml logs backend > backend.log
   ```

4. **Compartilhe esses arquivos ao pedir ajuda**

## 🔄 Comandos Úteis para Manutenção

```bash
# Ver status de todos os containers
docker-compose -f docker-compose.prod.yml ps

# Ver logs de um container específico
docker-compose -f docker-compose.prod.yml logs -f postgres

# Reiniciar um container específico
docker-compose -f docker-compose.prod.yml restart postgres

# Parar tudo
docker-compose -f docker-compose.prod.yml down

# Iniciar tudo
docker-compose -f docker-compose.prod.yml up -d

# Limpar recursos Docker
docker system prune -f

# Ver uso de recursos
docker system df
```

## 📝 Logs Importantes

### Localização dos Logs:
- **Container logs**: `docker-compose logs [container]`
- **Sistema**: `/var/log/syslog` ou `journalctl -u docker`
- **Docker daemon**: `journalctl -u docker.service`

### Comandos de Log Úteis:
```bash
# Logs em tempo real
docker-compose -f docker-compose.prod.yml logs -f

# Últimas 50 linhas
docker-compose -f docker-compose.prod.yml logs --tail=50

# Logs de um serviço específico
docker-compose -f docker-compose.prod.yml logs postgres

# Logs do sistema Docker
sudo journalctl -u docker.service --no-pager
```

---

**💡 Dica:** Sempre execute o diagnóstico primeiro para entender o problema antes de tentar corrigi-lo!