# NoWhats - Instalação Simplificada

## 🚀 Instalação em Um Único Comando

Este método substitui a instalação em duas partes por um processo único e automatizado.

### Pré-requisitos

- Ubuntu 22.04 LTS (recomendado)
- Usuário com privilégios sudo
- Domínio configurado apontando para seu servidor
- Acesso SSH ao servidor

### Como Instalar

1. **Faça upload dos arquivos para o servidor:**
   ```bash
   # No seu computador local
   scp -r nowhats/ usuario@seu-servidor:/home/usuario/
   ```

2. **Conecte-se ao servidor:**
   ```bash
   ssh usuario@seu-servidor
   ```

3. **Execute o instalador simplificado:**
   ```bash
   cd nowhats
   chmod +x install-simple.sh
   ./install-simple.sh
   ```

### O que o Instalador Faz

✅ **Instalação Automática:**
- Docker e Docker Compose
- Nginx como proxy reverso
- Certbot para SSL automático
- Todas as dependências necessárias

✅ **Configuração Inteligente:**
- Escolha entre domínio único ou subdomínios
- Configuração automática do Nginx
- SSL/HTTPS automático com Let's Encrypt
- Firewall básico configurado

✅ **Deploy da Aplicação:**
- Build automático dos containers
- Configuração de produção
- Criação do usuário administrador
- Scripts de manutenção

### Opções de Domínio

**Opção 1: Domínio Único**
- Frontend: `https://meusite.com`
- Backend: `https://meusite.com/api`

**Opção 2: Subdomínios**
- Frontend: `https://app.meusite.com`
- Backend: `https://api.meusite.com`

### Scripts de Manutenção

Após a instalação, você terá acesso aos seguintes scripts em `/opt/nowhats/`:

```bash
# Reiniciar a aplicação
./restart.sh

# Atualizar a aplicação
./update.sh

# Ver logs em tempo real
./logs.sh
```

### Verificação da Instalação

1. **Verificar se os containers estão rodando:**
   ```bash
   cd /opt/nowhats
   docker-compose -f docker-compose.prod.yml ps
   ```

2. **Verificar logs:**
   ```bash
   cd /opt/nowhats
   ./logs.sh
   ```

3. **Testar acesso:**
   - Acesse seu domínio no navegador
   - Verifique se o SSL está funcionando (cadeado verde)

### Solução de Problemas

#### ❌ Erro de Certificado SSL
Se você recebeu um erro como:
```
nginx: [emerg] cannot load certificate "/etc/letsencrypt/live/seudominio.com/fullchain.pem"
```

**Solução rápida:**
```bash
# Use o script de correção
chmod +x fix-nginx-ssl.sh
./fix-nginx-ssl.sh
```

Este script vai:
- Reconfigurar o Nginx sem SSL primeiro
- Verificar se a aplicação está rodando
- Obter os certificados SSL corretamente
- Aplicar a configuração SSL final

### ❌ Erro de Permissão ao Copiar Arquivos
Se você recebeu um erro como:
```
cp: cannot create regular file '/opt/nowhats/./.git/objects/pack/...': Permission denied
```

**Solução rápida:**
```bash
# Use o script de correção
chmod +x fix-copy-permissions.sh
./fix-copy-permissions.sh
```

Este script vai:
- Limpar arquivos problemáticos (.git, node_modules, logs)
- Instalar rsync se necessário
- Recopiar apenas os arquivos necessários
- Definir permissões corretas
- Verificar se todos os arquivos importantes foram copiados

### ❌ Erro de Build do Docker (npm ci)
Se você recebeu um erro como:
```
RUN npm ci --only=production && npm cache clean --force" did not complete successfully: exit code: 1
```

Ou erros relacionados ao `npm ci`:
```bash
npm error code EUSAGE
npm error The `npm ci` command can only install with an existing package-lock.json
```

### 🔍 Principais Causas de Erro

1. **Permissões de arquivo**: Scripts sem permissão de execução
2. **Dependências ausentes**: Docker ou Docker Compose não instalados
3. **Portas ocupadas**: Conflito com outros serviços
4. **Configuração incorreta do banco**: Backend configurado para SQLite em vez de PostgreSQL
5. **Atributo version obsoleto**: Docker Compose com versão antiga no arquivo de configuração
6. **Arquivo .env incompleto**: Falta de variáveis essenciais como DB_PASSWORD e JWT_SECRET
7. **Problemas de DNS/Rede**: Falha na resolução de nomes entre containers Docker

**Causas possíveis:**
1. **Frontend usando `npm ci --only=production`**: O build do React/Vite precisa das devDependencies
2. **Ausência do `package-lock.json`**: O `npm ci` requer este arquivo, mas o projeto pode usar apenas `package.json` (pode afetar frontend e/ou backend)
3. **Git não instalado**: Algumas dependências npm requerem git para instalação
4. **Conflitos de dependências peer**: Incompatibilidade entre versões de dependências (ex: React 19 com bibliotecas que suportam apenas React 16-18)
5. **Configuração incorreta do banco de dados**: O backend pode estar configurado para SQLite quando deveria usar PostgreSQL em produção
6. **Atributo version obsoleto**: O docker-compose.yml pode conter o atributo `version` que é obsoleto nas versões mais recentes do Docker Compose
7. **Arquivo .env ausente ou incompleto**: O arquivo `.env` pode não existir ou não conter as variáveis essenciais do PostgreSQL (DB_PASSWORD, JWT_SECRET, etc.), causando falha na conexão com o banco de dados

**Solução rápida:**
```bash
# Use o script de correção
chmod +x fix-docker-build.sh
./fix-docker-build.sh
```

Este script vai:
- Corrigir os Dockerfiles do frontend e backend:
  - Remove `--only=production` se presente no frontend
  - Substitui `npm ci` por `npm install` se `package-lock.json` não existir
  - Adiciona git às dependências do sistema no backend (se ausente)
  - Adiciona `--legacy-peer-deps` ao frontend para resolver conflitos de dependências
  - Corrige configuração do banco de dados no server.js (SQLite → PostgreSQL)
   - Remove atributo `version` obsoleto do docker-compose.prod.yml
   - Verifica e cria arquivo `.env` com todas as variáveis necessárias
   - Configura DNS públicos no backend para resolver problemas de rede
   - Adiciona logs detalhados para diagnosticar problemas de conectividade
- Limpar cache e imagens antigas do Docker
- Remover node_modules antigos
- Reconstruir as imagens do zero
- Iniciar os containers corretamente
- Verificar logs para possíveis problemas

#### Erro de Permissão
```bash
# Se aparecer erro de permissão do Docker
sudo usermod -aG docker $USER
# Faça logout e login novamente
```

#### SSL não Configurado
```bash
# Configure SSL manualmente
sudo certbot --nginx -d seu-dominio.com
```

#### Containers não Iniciam
```bash
# Verificar logs detalhados
cd /opt/nowhats
docker-compose -f docker-compose.prod.yml logs

# Reiniciar containers
./restart.sh
```

#### Domínio não Resolve
- Verifique se o DNS está apontando para o IP correto
- Aguarde a propagação do DNS (pode levar até 24h)
- Teste com: `nslookup seu-dominio.com`

### Vantagens do Instalador Simplificado

🎯 **Simplicidade:** Um único comando instala tudo
🔒 **Segurança:** SSL automático e firewall configurado
⚡ **Rapidez:** Instalação completa em ~10 minutos
🛠️ **Manutenção:** Scripts prontos para operação
📊 **Monitoramento:** Logs centralizados e acessíveis

### Estrutura Final

Após a instalação, sua estrutura será:

```
/opt/nowhats/
├── docker-compose.prod.yml
├── frontend/
├── backend/
├── restart.sh
├── update.sh
├── logs.sh
└── ...
```

### Suporte

Se encontrar problemas:

1. Verifique os logs: `cd /opt/nowhats && ./logs.sh`
2. Consulte a documentação de troubleshooting
3. Verifique se todos os pré-requisitos foram atendidos

---

**Nota:** Este instalador substitui completamente os scripts `install.sh` e `install-part2.sh` anteriores, oferecendo uma experiência muito mais simples e confiável.