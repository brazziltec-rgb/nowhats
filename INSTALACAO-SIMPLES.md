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