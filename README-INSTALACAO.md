# 🚀 NoWhats - Guia de Instalação Automática para Ubuntu 22.04

## 📋 Visão Geral

Este guia fornece instruções completas para instalar o sistema NoWhats em um servidor Ubuntu 22.04 usando o instalador automático. O sistema inclui:

- **Backend Node.js** com APIs REST
- **Frontend React** com interface moderna
- **PostgreSQL** como banco de dados
- **APIs WhatsApp**: Baileys, Evolution e Web.js
- **Nginx** como proxy reverso
- **SSL/HTTPS** automático com Let's Encrypt
- **Docker** para containerização
- **Redis** para cache (opcional)

## 🔧 Pré-requisitos

### Servidor
- **Ubuntu 22.04 LTS** (recomendado)
- **Mínimo**: 2 CPU cores, 4GB RAM, 20GB storage
- **Recomendado**: 4 CPU cores, 8GB RAM, 50GB storage
- **Acesso root** ou usuário com sudo
- **Conexão com internet** estável

### Domínio
- Domínio próprio com acesso ao painel DNS
- Registros A configurados apontando para o IP do servidor

### Portas Necessárias
- **22** (SSH)
- **80** (HTTP - redirecionamento)
- **443** (HTTPS)
- **5433** (PostgreSQL - apenas interno)

## 📦 Estrutura do Projeto

```
nowhats/
├── install.sh                 # Script principal de instalação
├── install-part2.sh          # Script de configuração final
├── docker-compose.prod.yml   # Configuração Docker para produção
├── nginx/
│   └── nowhats.conf          # Configuração Nginx
├── scripts/
│   ├── domain-validator.sh   # Validador de domínios
│   └── create-admin.sh       # Criador de usuário admin
├── backend/
│   ├── Dockerfile.prod       # Dockerfile do backend
│   └── ... (código do backend)
├── frontend/
│   ├── Dockerfile.prod       # Dockerfile do frontend
│   ├── nginx.conf           # Configuração Nginx do frontend
│   └── ... (código do frontend)
└── README-INSTALACAO.md      # Este arquivo
```

## 🚀 Instalação Rápida

### Passo 1: Preparar o Servidor

```bash
# Conectar ao servidor via SSH
ssh root@SEU_SERVIDOR_IP

# Atualizar sistema
apt update && apt upgrade -y

# Instalar Git
apt install -y git
```

### Passo 2: Baixar o Projeto

```bash
# Clonar o repositório
git clone https://github.com/seu-usuario/nowhats.git
cd nowhats

# Dar permissões de execução
chmod +x *.sh
chmod +x scripts/*.sh
```

### Passo 3: Executar Instalação

```bash
# Executar instalação parte 1
sudo bash install.sh

# Após conclusão, executar parte 2
sudo bash install-part2.sh
```

## 🔧 Configuração Detalhada

### Opções de Domínio

O instalador oferece duas opções:

#### 1. Domínio Único (Recomendado)
- Frontend e backend no mesmo domínio
- Exemplo: `app.seudominio.com`
- Mais simples de configurar
- Ideal para a maioria dos casos

#### 2. Subdomínios Separados
- Frontend e backend em subdomínios diferentes
- Exemplo: `app.seudominio.com` (frontend) e `api.seudominio.com` (backend)
- Maior flexibilidade
- Requer configuração CORS

### Configuração DNS

Antes da instalação, configure os registros DNS:

#### Para Domínio Único:
```
app.seudominio.com    A    SEU_SERVIDOR_IP
```

#### Para Subdomínios:
```
app.seudominio.com    A    SEU_SERVIDOR_IP
api.seudominio.com    A    SEU_SERVIDOR_IP
```

## 📋 Processo de Instalação Detalhado

### Parte 1 (install.sh)

1. **Verificação do Sistema**
   - Verifica se é Ubuntu 22.04
   - Confirma privilégios de root
   - Testa conectividade

2. **Configuração de Domínios**
   - Assistente interativo para escolha
   - Validação de formato de domínio
   - Verificação DNS (opcional)

3. **Configuração de Usuário Admin**
   - Email do administrador
   - Geração ou definição de senha
   - Validação de segurança

4. **Atualização do Sistema**
   - Atualização de pacotes
   - Instalação de dependências básicas
   - Configuração de timezone

5. **Instalação do Docker**
   - Docker Engine
   - Docker Compose
   - Configuração de usuário

6. **Instalação do Nginx**
   - Servidor web
   - Configurações básicas
   - Preparação para SSL

7. **Configuração do Firewall**
   - UFW (Uncomplicated Firewall)
   - Abertura de portas necessárias
   - Regras de segurança

8. **Instalação do Certbot**
   - Let's Encrypt client
   - Preparação para SSL automático

### Parte 2 (install-part2.sh)

1. **Configuração de Domínios**
   - Aplicação das configurações Nginx
   - Substituição de placeholders
   - Ativação de sites

2. **Configuração SSL**
   - Obtenção de certificados Let's Encrypt
   - Configuração automática no Nginx
   - Renovação automática

3. **Ambiente de Produção**
   - Criação do arquivo .env
   - Configuração de variáveis
   - Ajuste de permissões

4. **Inicialização dos Serviços**
   - Build das imagens Docker
   - Inicialização dos containers
   - Execução de migrações

5. **Criação do Usuário Admin**
   - Conexão com banco de dados
   - Hash da senha
   - Inserção no banco

6. **Configuração de Backup**
   - Script de backup automático
   - Agendamento via cron
   - Rotação de backups

## 🔐 Segurança

### Medidas Implementadas

- **SSL/TLS**: Certificados Let's Encrypt com renovação automática
- **Firewall**: UFW configurado com regras restritivas
- **Rate Limiting**: Proteção contra ataques de força bruta
- **Headers de Segurança**: HSTS, XSS Protection, etc.
- **Containers**: Isolamento de serviços
- **Usuários não-root**: Containers executam com usuários limitados
- **Senhas Seguras**: Geração automática de senhas fortes

### Recomendações Pós-Instalação

1. **Alterar senha do admin** no primeiro acesso
2. **Configurar backup externo** dos dados importantes
3. **Monitorar logs** regularmente
4. **Manter sistema atualizado**
5. **Configurar monitoramento** (opcional)

## 🐳 Gerenciamento Docker

### Comandos Úteis

```bash
# Navegar para o diretório do projeto
cd /opt/nowhats

# Ver status dos containers
docker-compose -f docker-compose.prod.yml ps

# Ver logs em tempo real
docker-compose -f docker-compose.prod.yml logs -f

# Reiniciar todos os serviços
docker-compose -f docker-compose.prod.yml restart

# Parar todos os serviços
docker-compose -f docker-compose.prod.yml down

# Iniciar todos os serviços
docker-compose -f docker-compose.prod.yml up -d

# Reconstruir e reiniciar
docker-compose -f docker-compose.prod.yml up -d --build

# Ver logs de um serviço específico
docker-compose -f docker-compose.prod.yml logs -f backend

# Executar comando no container
docker-compose -f docker-compose.prod.yml exec backend bash
```

### Serviços Disponíveis

- **postgres**: Banco de dados PostgreSQL
- **backend**: API Node.js
- **frontend**: Interface React
- **baileys**: API Baileys WhatsApp
- **evolution**: API Evolution WhatsApp
- **webjs**: API Web.js WhatsApp
- **redis**: Cache Redis (opcional)

## 📊 Monitoramento

### Logs Importantes

```bash
# Logs da aplicação
tail -f /opt/nowhats/logs/app.log

# Logs do Nginx
tail -f /var/log/nginx/nowhats_access.log
tail -f /var/log/nginx/nowhats_error.log

# Logs do sistema
journalctl -u docker -f
```

### Health Checks

```bash
# Verificar saúde da aplicação
curl https://seudominio.com/health

# Verificar API
curl https://seudominio.com/api/health

# Verificar containers
docker-compose -f /opt/nowhats/docker-compose.prod.yml ps
```

## 🔄 Backup e Restauração

### Backup Automático

O sistema configura backup automático diário às 2h da manhã:

```bash
# Ver backups disponíveis
ls -la /opt/nowhats/backups/

# Executar backup manual
/opt/nowhats/backup.sh
```

### Restauração

```bash
# Parar serviços
cd /opt/nowhats
docker-compose -f docker-compose.prod.yml down

# Restaurar backup
gunzip /opt/nowhats/backups/nowhats_backup_YYYYMMDD_HHMMSS.sql.gz
docker-compose -f docker-compose.prod.yml exec -T postgres \
    psql -U nowhats -d nowhats < /opt/nowhats/backups/nowhats_backup_YYYYMMDD_HHMMSS.sql

# Reiniciar serviços
docker-compose -f docker-compose.prod.yml up -d
```

## 🔧 Manutenção

### Atualizações

```bash
# Atualizar código
cd /opt/nowhats
git pull origin main

# Reconstruir containers
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d
```

### Limpeza

```bash
# Limpar containers não utilizados
docker system prune -f

# Limpar imagens antigas
docker image prune -f

# Limpar volumes não utilizados
docker volume prune -f
```

## ❗ Solução de Problemas

### Problemas Comuns

#### 1. Erro de DNS
```bash
# Verificar configuração DNS
dig seudominio.com
nslookup seudominio.com
```

#### 2. Erro de SSL
```bash
# Verificar certificados
certbot certificates

# Renovar manualmente
certbot renew --dry-run
```

#### 3. Container não inicia
```bash
# Ver logs detalhados
docker-compose -f docker-compose.prod.yml logs nome_do_container

# Verificar recursos
df -h
free -m
```

#### 4. Banco de dados
```bash
# Conectar ao PostgreSQL
docker-compose -f docker-compose.prod.yml exec postgres \
    psql -U nowhats -d nowhats

# Verificar tabelas
\dt
```

### Logs de Debug

```bash
# Ativar modo debug
echo "LOG_LEVEL=debug" >> /opt/nowhats/.env
docker-compose -f docker-compose.prod.yml restart backend
```

## 📞 Suporte

### Informações do Sistema

```bash
# Informações da instalação
cat /opt/nowhats/.admin_info

# Versão dos serviços
docker-compose -f /opt/nowhats/docker-compose.prod.yml version

# Status geral
systemctl status nginx
systemctl status docker
ufw status
```

### Contato

- **Documentação**: [Link para documentação]
- **Issues**: [Link para issues do GitHub]
- **Suporte**: [Email de suporte]

## 📄 Licença

Este projeto está licenciado sob a [Licença MIT](LICENSE).

---

**⚠️ Importante**: Sempre mantenha backups atualizados e monitore os logs do sistema regularmente. Em caso de problemas, consulte a seção de solução de problemas ou entre em contato com o suporte.