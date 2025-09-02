# Correção do Erro "Diretório scripts não encontrado"

## Problema
O instalador está falhando com o erro:
```
[2025-09-02 02:44:43] ERROR: Diretório de scripts não encontrado: /home/marcos/nowhats/scripts
```

## Causa
O diretório `scripts/` não foi copiado para o servidor Ubuntu durante o upload dos arquivos.

## Soluções

### Solução 1: Usar a Versão Corrigida do install.sh

A versão mais recente do `install.sh` foi corrigida para criar automaticamente os scripts necessários se o diretório não existir.

**Passos:**
1. Substitua o arquivo `install.sh` no servidor pela versão corrigida
2. Execute novamente:
   ```bash
   chmod +x install.sh
   ./install.sh
   ```

### Solução 2: Copiar o Diretório Scripts Manualmente

**No seu computador local:**
1. Comprima o diretório scripts:
   ```bash
   tar -czf scripts.tar.gz scripts/
   ```

**No servidor Ubuntu:**
1. Faça upload do arquivo `scripts.tar.gz`
2. Extraia no diretório do projeto:
   ```bash
   cd /home/marcos/nowhats
   tar -xzf scripts.tar.gz
   chmod +x scripts/*.sh
   ```

### Solução 3: Criar Scripts Básicos Manualmente

Se preferir criar os scripts manualmente no servidor:

```bash
# Criar diretório
mkdir -p /home/marcos/nowhats/scripts

# Criar domain-validator.sh
cat > /home/marcos/nowhats/scripts/domain-validator.sh << 'EOF'
#!/bin/bash
set -e

echo "Escolha o tipo de configuração:"
echo "1) Domínio único (exemplo.com)"
echo "2) Subdomínios (app.exemplo.com e api.exemplo.com)"
read -p "Opção [1-2]: " DOMAIN_CHOICE

sudo mkdir -p /opt/nowhats

case $DOMAIN_CHOICE in
    1)
        read -p "Digite seu domínio (ex: exemplo.com): " MAIN_DOMAIN
        echo "DOMAIN_TYPE=single" | sudo tee /opt/nowhats/.domain_config
        echo "MAIN_DOMAIN=$MAIN_DOMAIN" | sudo tee -a /opt/nowhats/.domain_config
        echo "FRONTEND_DOMAIN=$MAIN_DOMAIN" | sudo tee -a /opt/nowhats/.domain_config
        echo "BACKEND_DOMAIN=$MAIN_DOMAIN" | sudo tee -a /opt/nowhats/.domain_config
        ;;
    2)
        read -p "Digite o domínio do frontend (ex: app.exemplo.com): " FRONTEND_DOMAIN
        read -p "Digite o domínio do backend (ex: api.exemplo.com): " BACKEND_DOMAIN
        echo "DOMAIN_TYPE=subdomain" | sudo tee /opt/nowhats/.domain_config
        echo "FRONTEND_DOMAIN=$FRONTEND_DOMAIN" | sudo tee -a /opt/nowhats/.domain_config
        echo "BACKEND_DOMAIN=$BACKEND_DOMAIN" | sudo tee -a /opt/nowhats/.domain_config
        ;;
    *)
        echo "Opção inválida"
        exit 1
        ;;
esac

echo "Configuração de domínios salva em /opt/nowhats/.domain_config"
EOF

# Dar permissões
chmod +x /home/marcos/nowhats/scripts/domain-validator.sh
```

## Verificação

Após aplicar qualquer uma das soluções, verifique se o diretório foi criado:

```bash
ls -la /home/marcos/nowhats/scripts/
```

Deveria mostrar pelo menos o arquivo `domain-validator.sh`.

## Executar Novamente

Após corrigir, execute o instalador:

```bash
cd /home/marcos/nowhats
./install.sh
```

## Observações

- A versão corrigida do `install.sh` cria automaticamente scripts básicos se não existirem
- Os scripts criados automaticamente são versões simplificadas que funcionam para a instalação básica
- Para funcionalidades avançadas, copie os scripts completos do diretório `scripts/` original