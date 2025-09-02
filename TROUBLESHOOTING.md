# Guia de Solução de Problemas - Nowhats

Este guia aborda os problemas mais comuns encontrados durante a instalação e operação do Nowhats, com soluções práticas e comandos de diagnóstico.

## Índice

1. [Problemas de Instalação](#problemas-de-instalação)
2. [Problemas de DNS e Domínios](#problemas-de-dns-e-domínios)
3. [Problemas de SSL/TLS](#problemas-de-ssltls)
4. [Problemas do Docker](#problemas-do-docker)
5. [Problemas do Nginx](#problemas-do-nginx)
6. [Problemas de Banco de Dados](#problemas-de-banco-de-dados)
7. [Problemas de Performance](#problemas-de-performance)
8. [Comandos de Diagnóstico](#comandos-de-diagnóstico)

## Problemas de Instalação

### 1. Script de Instalação Falha

**Sintomas**:
- Erro "Permission denied" ao executar scripts
- Comandos não encontrados
- Falha na instalação do Docker

**Diagnóstico**:
```bash
# Verificar se está executando como root
whoami

# Verificar permissões do script
ls -la install.sh

# Verificar sistema operacional
lsb_release -a
```

**Soluções**:
```bash
# Executar como root
sudo su -

# Dar permissão de execução
chmod +x install.sh install-part2.sh
chmod +x scripts/*.sh

# Verificar se é Ubuntu 22.04
if [ "$(lsb_release -rs)" != "22.04" ]; then
    echo "Aviso: Sistema não testado. Recomendado Ubuntu 22.04"
fi
```

### 2. Falha na Instalação do Docker

**Sintomas**:
- Erro "docker: command not found"
- Falha ao baixar imagens
- Problemas de conectividade

**Diagnóstico**:
```bash
# Verificar instalação do Docker
docker --version
docker-compose --version

# Verificar status do serviço
systemctl status docker

# Testar conectividade
curl -I https://registry-1.docker.io
```

**Soluções**:
```bash
# Reinstalar Docker
apt remove docker docker-engine docker.io containerd runc
apt update
apt install -y apt-transport-https ca-certificates curl gnupg lsb-release

# Adicionar repositório oficial
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar Docker
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Iniciar serviço
systemctl start docker
systemctl enable docker

# Testar instalação
docker run hello-world
```

## Problemas de DNS e Domínios

### 1. Domínio Não Resolve

**Sintomas**:
- Erro "Name or service not known"
- Timeout ao acessar domínio
- Certificado SSL não pode ser obtido

**Diagnóstico**:
```bash
# Verificar resolução DNS
dig +short exemplo.com
nslookup exemplo.com

# Verificar propagação DNS
dig @8.8.8.8 exemplo.com
dig @1.1.1.1 exemplo.com

# Testar de diferentes locais
curl -I http://exemplo.com
wget --spider http://exemplo.com
```

**Soluções**:
```bash
# Aguardar propagação DNS (pode levar até 48h)
echo "Aguardando propagação DNS..."
while ! dig +short exemplo.com | grep -q "[0-9]"; do
    echo "DNS ainda não propagado. Aguardando 60 segundos..."
    sleep 60
done

# Verificar configuração no provedor DNS
echo "Verifique se os registros A estão corretos:"
echo "A exemplo.com -> $(curl -s ifconfig.me)"
echo "A app.exemplo.com -> $(curl -s ifconfig.me)"
echo "A api.exemplo.com -> $(curl -s ifconfig.me)"

# Usar DNS público temporariamente
echo "nameserver 8.8.8.8" > /etc/resolv.conf.backup
echo "nameserver 8.8.8.8" > /etc/resolv.conf
echo "nameserver 1.1.1.1" >> /etc/resolv.conf
```

### 2. Subdomínios Não Funcionam

**Sintomas**:
- Domínio principal funciona, subdomínios não
- Erro 404 em subdomínios
- Certificado SSL apenas para domínio principal

**Diagnóstico**:
```bash
# Verificar cada subdomínio
for subdomain in app api; do
    echo "Testando $subdomain.exemplo.com:"
    dig +short $subdomain.exemplo.com
    curl -I http://$subdomain.exemplo.com
done

# Verificar configuração Nginx
nginx -T | grep server_name
```

**Soluções**:
```bash
# Reconfigurar domínios
rm -f /opt/nowhats/.domain_config
./scripts/domain-validator.sh

# Reconfigurar Nginx
./scripts/configure-nginx-domains.sh

# Obter certificados para subdomínios
./scripts/configure-ssl.sh
```

## Problemas de SSL/TLS

### 1. Falha na Obtenção de Certificado

**Sintomas**:
- Erro "Failed authorization procedure"
- "Domain validation failed"
- "Too many requests" do Let's Encrypt

**Diagnóstico**:
```bash
# Verificar logs do Certbot
tail -f /var/log/letsencrypt/letsencrypt.log

# Verificar rate limits
certbot certificates

# Testar acesso HTTP
curl -I http://exemplo.com/.well-known/acme-challenge/test
```

**Soluções**:
```bash
# Verificar se domínio está acessível
for domain in exemplo.com app.exemplo.com api.exemplo.com; do
    echo "Testando $domain:"
    curl -I http://$domain
done

# Limpar certificados existentes se necessário
certbot delete --cert-name exemplo.com

# Usar modo staging para testes
certbot certonly --nginx --staging -d exemplo.com -d app.exemplo.com -d api.exemplo.com

# Se staging funcionar, obter certificado real
certbot certonly --nginx -d exemplo.com -d app.exemplo.com -d api.exemplo.com

# Verificar configuração Nginx
nginx -t
systemctl reload nginx
```

### 2. Certificado Expirado ou Inválido

**Sintomas**:
- Aviso de certificado no navegador
- "SSL certificate problem"
- Erro de data/hora

**Diagnóstico**:
```bash
# Verificar certificados
certbot certificates

# Verificar data do sistema
date
timedatectl status

# Testar certificado
openssl s_client -connect exemplo.com:443 -servername exemplo.com
```

**Soluções**:
```bash
# Sincronizar horário
timedatectl set-ntp true
ntpdate -s time.nist.gov

# Renovar certificados
certbot renew --force-renewal

# Verificar renovação automática
certbot renew --dry-run

# Recarregar Nginx
systemctl reload nginx
```

## Problemas do Docker

### 1. Containers Não Iniciam

**Sintomas**:
- Status "Exited" nos containers
- Erro "port already in use"
- Falha ao conectar com banco de dados

**Diagnóstico**:
```bash
# Verificar status dos containers
docker-compose -f docker-compose.prod.yml ps

# Verificar logs
docker-compose -f docker-compose.prod.yml logs

# Verificar portas em uso
netstat -tlnp | grep -E ':(80|443|5432|6379)'

# Verificar recursos do sistema
df -h
free -m
```

**Soluções**:
```bash
# Parar todos os containers
docker-compose -f docker-compose.prod.yml down

# Limpar containers órfãos
docker system prune -f

# Verificar se portas estão livres
sudo lsof -i :80
sudo lsof -i :443

# Reiniciar containers
docker-compose -f docker-compose.prod.yml up -d

# Verificar logs em tempo real
docker-compose -f docker-compose.prod.yml logs -f
```

### 2. Problemas de Rede entre Containers

**Sintomas**:
- Frontend não consegue acessar backend
- Erro "Connection refused"
- Timeout entre serviços

**Diagnóstico**:
```bash
# Verificar redes Docker
docker network ls
docker network inspect nowhats_default

# Testar conectividade entre containers
docker-compose -f docker-compose.prod.yml exec nowhats-frontend ping nowhats-backend
docker-compose -f docker-compose.prod.yml exec nowhats-backend ping nowhats-db
```

**Soluções**:
```bash
# Recriar rede Docker
docker-compose -f docker-compose.prod.yml down
docker network prune -f
docker-compose -f docker-compose.prod.yml up -d

# Verificar variáveis de ambiente
docker-compose -f docker-compose.prod.yml config

# Verificar se serviços estão escutando nas portas corretas
docker-compose -f docker-compose.prod.yml exec nowhats-backend netstat -tlnp
```

## Problemas do Nginx

### 1. Erro 502 Bad Gateway

**Sintomas**:
- Página de erro 502 no navegador
- "upstream prematurely closed connection"
- Backend inacessível

**Diagnóstico**:
```bash
# Verificar logs do Nginx
tail -f /var/log/nginx/error.log

# Verificar configuração
nginx -t

# Verificar se backend está rodando
curl -I http://localhost:3000
docker-compose -f docker-compose.prod.yml ps nowhats-backend
```

**Soluções**:
```bash
# Verificar se containers estão rodando
docker-compose -f docker-compose.prod.yml up -d

# Testar backend diretamente
curl http://localhost:3000/api/health

# Recarregar configuração Nginx
nginx -s reload

# Se necessário, reiniciar Nginx
systemctl restart nginx
```

### 2. Erro 404 Not Found

**Sintomas**:
- Página não encontrada
- Rotas da API não funcionam
- Assets do frontend não carregam

**Diagnóstico**:
```bash
# Verificar configuração do Nginx
cat /etc/nginx/sites-available/nowhats

# Verificar se site está ativo
ls -la /etc/nginx/sites-enabled/

# Testar configuração
nginx -t
```

**Soluções**:
```bash
# Reconfigurar Nginx
./scripts/configure-nginx-domains.sh

# Verificar se link simbólico existe
ln -sf /etc/nginx/sites-available/nowhats /etc/nginx/sites-enabled/

# Remover configuração padrão se necessário
rm -f /etc/nginx/sites-enabled/default

# Recarregar Nginx
systemctl reload nginx
```

## Problemas de Banco de Dados

### 1. Conexão com Banco Falha

**Sintomas**:
- "Connection refused" ao PostgreSQL
- "password authentication failed"
- Timeout de conexão

**Diagnóstico**:
```bash
# Verificar container do banco
docker-compose -f docker-compose.prod.yml ps nowhats-db

# Verificar logs do banco
docker-compose -f docker-compose.prod.yml logs nowhats-db

# Testar conexão
docker-compose -f docker-compose.prod.yml exec nowhats-db psql -U nowhats -d nowhats -c "SELECT 1;"
```

**Soluções**:
```bash
# Verificar variáveis de ambiente
cat /opt/nowhats/.env | grep DB_

# Reiniciar container do banco
docker-compose -f docker-compose.prod.yml restart nowhats-db

# Verificar se volume está montado corretamente
docker volume ls | grep nowhats

# Se necessário, recriar banco
docker-compose -f docker-compose.prod.yml down -v
docker-compose -f docker-compose.prod.yml up -d
```

### 2. Migrações Não Executam

**Sintomas**:
- Tabelas não existem
- Erro "relation does not exist"
- Schema desatualizado

**Diagnóstico**:
```bash
# Verificar tabelas existentes
docker-compose -f docker-compose.prod.yml exec nowhats-db psql -U nowhats -d nowhats -c "\dt"

# Verificar logs da aplicação
docker-compose -f docker-compose.prod.yml logs nowhats-backend | grep migration
```

**Soluções**:
```bash
# Executar migrações manualmente
docker-compose -f docker-compose.prod.yml exec nowhats-backend npm run migrate

# Verificar arquivos de migração
ls -la backend/database/migrations/

# Se necessário, resetar banco
docker-compose -f docker-compose.prod.yml down -v
docker volume rm nowhats_postgres_data
docker-compose -f docker-compose.prod.yml up -d
```

## Problemas de Performance

### 1. Aplicação Lenta

**Sintomas**:
- Tempo de resposta alto
- Timeout em requisições
- Interface travando

**Diagnóstico**:
```bash
# Verificar recursos do sistema
top
htop
free -m
df -h

# Verificar logs de performance
docker-compose -f docker-compose.prod.yml logs | grep -i "slow\|timeout\|error"

# Monitorar containers
docker stats
```

**Soluções**:
```bash
# Aumentar recursos se necessário
# Verificar se há swap disponível
swapon --show

# Otimizar configuração do PostgreSQL
docker-compose -f docker-compose.prod.yml exec nowhats-db psql -U nowhats -d nowhats -c "VACUUM ANALYZE;"

# Limpar logs antigos
docker system prune -f
journalctl --vacuum-time=7d

# Reiniciar containers para liberar memória
docker-compose -f docker-compose.prod.yml restart
```

### 2. Alto Uso de Disco

**Sintomas**:
- Disco cheio
- Erro "No space left on device"
- Logs muito grandes

**Diagnóstico**:
```bash
# Verificar uso de disco
df -h
du -sh /var/lib/docker/
du -sh /var/log/

# Verificar volumes Docker
docker system df
```

**Soluções**:
```bash
# Limpar containers e imagens não utilizados
docker system prune -a -f

# Limpar logs do Docker
journalctl --vacuum-time=3d
truncate -s 0 /var/lib/docker/containers/*/*-json.log

# Configurar rotação de logs
echo '{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}' > /etc/docker/daemon.json

systemctl restart docker
```

## Comandos de Diagnóstico

### Script de Diagnóstico Completo

```bash
#!/bin/bash
# diagnostic.sh - Script de diagnóstico completo

echo "=== DIAGNÓSTICO DO SISTEMA NOWHATS ==="
echo "Data: $(date)"
echo

echo "--- Sistema ---"
uname -a
lsb_release -a
uptime
echo

echo "--- Recursos ---"
free -h
df -h
echo

echo "--- Docker ---"
docker --version
docker-compose --version
docker ps
echo

echo "--- Containers Nowhats ---"
cd /opt/nowhats
docker-compose -f docker-compose.prod.yml ps
echo

echo "--- Nginx ---"
systemctl status nginx --no-pager
nginx -t
echo

echo "--- SSL ---"
certbot certificates
echo

echo "--- DNS ---"
for domain in $(grep DOMAIN /opt/nowhats/.domain_config | cut -d'=' -f2 | tr -d '"'); do
    echo "Testando $domain:"
    dig +short $domain
    curl -I http://$domain 2>/dev/null | head -1
done
echo

echo "--- Logs Recentes ---"
echo "Nginx:"
tail -5 /var/log/nginx/error.log
echo
echo "Docker:"
docker-compose -f docker-compose.prod.yml logs --tail=5
echo

echo "=== FIM DO DIAGNÓSTICO ==="
```

### Comandos Úteis de Monitoramento

```bash
# Monitoramento em tempo real
watch -n 2 'docker-compose -f /opt/nowhats/docker-compose.prod.yml ps'

# Logs em tempo real
docker-compose -f /opt/nowhats/docker-compose.prod.yml logs -f

# Monitorar recursos
watch -n 1 'free -m && echo && df -h'

# Verificar conectividade
watch -n 5 'curl -I https://app.exemplo.com'

# Monitorar certificados
watch -n 3600 'certbot certificates | grep -A2 -B2 "VALID"'
```

## Contato para Suporte

Se os problemas persistirem após seguir este guia:

1. **Colete informações de diagnóstico**:
   ```bash
   ./diagnostic.sh > diagnostico-$(date +%Y%m%d-%H%M).txt
   ```

2. **Documente o problema**:
   - Passos para reproduzir
   - Mensagens de erro exatas
   - Quando o problema começou
   - Mudanças recentes no sistema

3. **Entre em contato**:
   - Abra uma issue no repositório GitHub
   - Inclua o arquivo de diagnóstico
   - Descreva o ambiente e configuração

---

**Lembre-se**: Sempre faça backup das configurações antes de aplicar correções que possam afetar dados importantes.