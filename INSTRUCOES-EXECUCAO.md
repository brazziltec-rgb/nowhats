# Instruções de Execução - NoWhats Installer

## ⚠️ IMPORTANTE: Ordem e Permissões Corretas

O instalador do NoWhats é dividido em **2 partes** que devem ser executadas com **permissões diferentes**:

### 📋 Sequência Correta de Execução

#### 1️⃣ Primeira Parte (Como usuário normal)
```bash
# Execute como usuário normal (NÃO use sudo)
chmod +x install.sh
./install.sh
```

**❌ NÃO execute:** `sudo ./install.sh`

#### 2️⃣ Segunda Parte (Como root)
```bash
# Execute como root (USE sudo)
sudo bash install-part2.sh
```

**❌ NÃO execute:** `./install-part2.sh` (sem sudo)

## 🔍 Por que Permissões Diferentes?

### install.sh (Usuário Normal)
- Configura arquivos de usuário
- Cria configurações básicas
- Prepara ambiente Docker
- Não precisa de privilégios administrativos

### install-part2.sh (Root/Sudo)
- Configura Nginx
- Instala certificados SSL
- Modifica arquivos do sistema
- Precisa de privilégios administrativos

## 🚨 Mensagens de Erro Comuns

### Se executar install.sh como root:
```
ERROR: Este script (install.sh) não deve ser executado como root.
Execute como usuário normal: ./install.sh
Após concluir, execute a parte 2 como root: sudo bash install-part2.sh
```

### Se executar install-part2.sh sem sudo:
```
ERROR: Este script (install-part2.sh) deve ser executado como root.
Execute: sudo bash install-part2.sh
Certifique-se de ter executado ./install.sh primeiro como usuário normal.
```

## ✅ Sequência Completa Correta

```bash
# 1. Dar permissões
chmod +x install.sh install-part2.sh
chmod +x scripts/*.sh

# 2. Executar parte 1 (usuário normal)
./install.sh

# 3. Executar parte 2 (como root)
sudo bash install-part2.sh
```

## 🔧 Solução de Problemas

### Se você executou na ordem errada:

1. **Limpe arquivos temporários:**
   ```bash
   sudo rm -rf /opt/nowhats/.install_config
   sudo rm -rf /opt/nowhats/.domain_config
   ```

2. **Reinicie a instalação:**
   ```bash
   ./install.sh
   sudo bash install-part2.sh
   ```

### Verificar se você está executando como usuário correto:

```bash
# Para verificar se você é root:
whoami
# Se retornar "root", você está como root
# Se retornar seu nome de usuário, você está como usuário normal

# Para verificar ID do usuário:
id -u
# Se retornar "0", você está como root
# Se retornar outro número, você está como usuário normal
```

## 📝 Resumo Rápido

| Script | Permissão | Comando |
|--------|-----------|----------|
| install.sh | Usuário Normal | `./install.sh` |
| install-part2.sh | Root (sudo) | `sudo bash install-part2.sh` |

**Lembre-se:** Sempre execute o `install.sh` primeiro, depois o `install-part2.sh`!