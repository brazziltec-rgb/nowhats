# Instalação Automática do Nowhats

Este guia documenta o processo completo de instalação automática do Nowhats em servidores Ubuntu 22.04, incluindo configuração de domínios, SSL e usuário administrador.

## Pré-requisitos

### Sistema Operacional
- Ubuntu 22.04 LTS (recomendado)
- Acesso root ao servidor
- Conexão com a internet

### Domínio e DNS
- Domínio próprio registrado
- Acesso ao painel de controle DNS do domínio
- Capacidade de criar registros A/CNAME

### Portas de Rede
Certifique-se de que as seguintes portas estejam abertas:
- **80** (HTTP) - Para redirecionamento e validação SSL
- **443** (HTTPS) - Para acesso seguro à aplicação
- **22** (SSH) - Para acesso remoto ao servidor

## Arquitetura da Solução

A instalação automática do Nowhats consiste em vários scripts especializados:

### Scripts Principais

1. **`install.sh`** - Script principal de instalação
   - Instala Docker e Docker Compose
   - Configura o ambiente base
   - Executa o assistente de configuração de domínios

2. **`install-part2.sh`** - Segunda parte da instalação
   - Configura Nginx e SSL
   - Cria usuário administrador
   - Inicia os serviços

### Scripts Auxiliares

3. **`scripts/domain-validator.sh`** - Assistente interativo de domínios
   - Valida configuração DNS
   - Suporta domínio único ou subdomínios
   - Gera configuração automática

4. **`scripts/configure-nginx-domains.sh`** - Configuração automática do Nginx
   - Gera arquivos de configuração
   - Ativa sites e desativa padrão
   - Testa configuração

5. **`scripts/configure-ssl.sh`** - Configuração automática de SSL
   - Obtém certificados Let's Encrypt
   - Configura renovação automática
   - Aplica configurações de segurança

6. **`scripts/setup-admin-user.sh`** - Configuração do usuário administrador
   - Cria usuário padrão via API
   - Gera senhas seguras
   - Salva credenciais em arquivo protegido

## Processo de Instalação

### Passo 1: Preparação do Servidor

```bash
# Conecte-se ao servidor via SSH
ssh root@seu-servidor.com

# Atualize o sistema
apt update && apt upgrade -y

# Clone o repositório
git clone https://github.com/seu-usuario/nowhats.git
cd nowhats
```

### Passo 2: Execução da Instalação

```bash
# Torne o script executável
chmod +x install.sh

# Execute a instalação
./install.sh
```

### Passo 3: Configuração de Domínios

O assistente interativo irá guiá-lo através das seguintes opções:

#### Opção 1: Domínio Único
- **Configuração**: `exemplo.com`
- **Frontend**: `exemplo.com`
- **Backend**: `exemplo.com/api`
- **Registro DNS**: `A exemplo.com -> IP_DO_SERVIDOR`

#### Opção 2: Subdomínios
- **Frontend**: `app.exemplo.com`
- **Backend**: `api.exemplo.com`
- **Registros DNS**:
  - `A app.exemplo.com -> IP_DO_SERVIDOR`
  - `A api.exemplo.com -> IP_DO_SERVIDOR`

### Passo 4: Configuração DNS

Após escolher a configuração, você receberá instruções específicas para configurar os registros DNS:

```
=== CONFIGURAÇÃO DNS NECESSÁRIA ===
Configure os seguintes registros no seu provedor DNS:

Tipo: A
Nome: app.exemplo.com
Valor: 192.168.1.100
TTL: 300

Tipo: A
Nome: api.exemplo.com
Valor: 192.168.1.100
TTL: 300
```

### Passo 5: Continuação da Instalação

Após configurar o DNS, execute a segunda parte:

```bash
# Execute a segunda parte da instalação
./install-part2.sh
```

### Passo 6: Configuração SSL

O script irá automaticamente:
- Verificar a acessibilidade dos domínios
- Obter certificados SSL via Let's Encrypt
- Configurar renovação automática
- Aplicar configurações de segurança

### Passo 7: Criação do Usuário Administrador

O sistema irá:
- Aguardar a disponibilidade da API
- Criar o usuário administrador padrão
- Gerar senha segura automaticamente
- Salvar credenciais em `/opt/nowhats/.admin_credentials`

## Configurações Geradas

### Arquivos de Configuração

- **`/opt/nowhats/.domain_config`** - Configuração de domínios
- **`/opt/nowhats/.install_config`** - Variáveis de instalação
- **`/opt/nowhats/.admin_credentials`** - Credenciais do administrador
- **`/etc/nginx/sites-available/nowhats`** - Configuração do Nginx
- **`/opt/nowhats/.env`** - Variáveis de ambiente da aplicação

### Serviços Docker

A aplicação utiliza os seguintes containers:

```yaml
serviços:
  - nowhats-frontend  # Interface web (React)
  - nowhats-backend   # API (Node.js)
  - nowhats-db        # Banco de dados (PostgreSQL)
  - nowhats-redis     # Cache (Redis)
  - nginx             # Proxy reverso
```

## Verificação da Instalação

### Verificar Status dos Serviços

```bash
# Verificar containers Docker
docker-compose -f /opt/nowhats/docker-compose.prod.yml ps

# Verificar logs
docker-compose -f /opt/nowhats/docker-compose.prod.yml logs -f

# Verificar configuração do Nginx
nginx -t
systemctl status nginx
```

### Verificar Certificados SSL

```bash
# Verificar certificados
certbot certificates

# Testar renovação
certbot renew --dry-run
```

### Acessar a Aplicação

1. **Frontend**: `https://app.exemplo.com` ou `https://exemplo.com`
2. **API**: `https://api.exemplo.com` ou `https://exemplo.com/api`

### Credenciais do Administrador

```bash
# Visualizar credenciais do admin
cat /opt/nowhats/.admin_credentials
```

## Comandos Úteis

### Gerenciamento de Serviços

```bash
# Parar todos os serviços
cd /opt/nowhats
docker-compose -f docker-compose.prod.yml down

# Iniciar todos os serviços
docker-compose -f docker-compose.prod.yml up -d

# Reiniciar um serviço específico
docker-compose -f docker-compose.prod.yml restart nowhats-backend

# Visualizar logs em tempo real
docker-compose -f docker-compose.prod.yml logs -f nowhats-backend
```

### Backup e Manutenção

```bash
# Backup do banco de dados
docker-compose -f docker-compose.prod.yml exec nowhats-db pg_dump -U nowhats nowhats > backup_$(date +%Y%m%d).sql

# Atualizar aplicação
cd /opt/nowhats
git pull
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

## Solução de Problemas

### Problemas Comuns

#### 1. Erro de DNS
```bash
# Verificar resolução DNS
dig app.exemplo.com
nslookup api.exemplo.com
```

#### 2. Erro de SSL
```bash
# Verificar certificados
certbot certificates

# Renovar manualmente
certbot renew --force-renewal
```

#### 3. Serviços não iniciam
```bash
# Verificar logs
docker-compose -f docker-compose.prod.yml logs

# Verificar recursos do sistema
df -h
free -m
```

#### 4. Problemas de conectividade
```bash
# Verificar portas abertas
netstat -tlnp | grep -E ':(80|443|22)'

# Testar conectividade
curl -I https://app.exemplo.com
```

### Logs Importantes

- **Nginx**: `/var/log/nginx/error.log`
- **Certbot**: `/var/log/letsencrypt/letsencrypt.log`
- **Docker**: `docker-compose logs`
- **Sistema**: `/var/log/syslog`

## Segurança

### Configurações Aplicadas

1. **SSL/TLS**:
   - Certificados Let's Encrypt
   - Redirecionamento HTTP para HTTPS
   - Headers de segurança (HSTS, CSP, etc.)

2. **Nginx**:
   - Rate limiting
   - Proteção contra ataques comuns
   - Compressão gzip

3. **Docker**:
   - Containers isolados
   - Redes internas
   - Volumes persistentes

4. **Banco de Dados**:
   - Senhas geradas automaticamente
   - Acesso restrito à rede interna
   - Backup automático

### Recomendações Adicionais

1. **Firewall**:
   ```bash
   ufw enable
   ufw allow 22/tcp
   ufw allow 80/tcp
   ufw allow 443/tcp
   ```

2. **Monitoramento**:
   - Configure alertas para uso de recursos
   - Monitore logs de erro
   - Verifique renovação de certificados

3. **Backup**:
   - Configure backup automático do banco
   - Faça backup das configurações
   - Teste restauração periodicamente

## Suporte

Para suporte técnico ou dúvidas:

1. Verifique os logs de erro
2. Consulte a seção de solução de problemas
3. Abra uma issue no repositório GitHub
4. Entre em contato com a equipe de suporte

---

**Nota**: Esta documentação assume familiaridade básica com Linux, Docker e administração de servidores. Para usuários iniciantes, recomenda-se buscar assistência técnica especializada.