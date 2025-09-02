# Nowhats - Sistema de Atendimento WhatsApp

O Nowhats é uma plataforma completa para gerenciamento de atendimento via WhatsApp, oferecendo múltiplas integrações, interface moderna e instalação automatizada.

## 🚀 Instalação Rápida (Produção)

Para instalação em servidor Ubuntu 22.04:

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/nowhats.git
cd nowhats

# Execute a instalação automática
chmod +x install.sh
./install.sh
```

📖 **Documentação Completa**: [INSTALACAO-AUTOMATICA.md](./INSTALACAO-AUTOMATICA.md)

## 🛠️ Desenvolvimento Local

Para desenvolvimento local:

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

## 📚 Documentação

- **[Instalação Automática](./INSTALACAO-AUTOMATICA.md)** - Guia completo de instalação em produção
- **[Scripts de Instalação](./scripts/README.md)** - Documentação dos scripts automatizados
- **[Solução de Problemas](./TROUBLESHOOTING.md)** - Guia de troubleshooting
- **[Configuração Docker](./DOCKER-SETUP.md)** - Setup com Docker
- **[APIs Disponíveis](./DOCKER-APIS.md)** - Documentação das APIs

## ✨ Características

- **Múltiplas Integrações**: Baileys, Evolution API, Web.js
- **Interface Moderna**: React + TypeScript + Tailwind CSS
- **Instalação Automática**: Scripts para Ubuntu 22.04
- **SSL Automático**: Certificados Let's Encrypt
- **Proxy Reverso**: Nginx configurado automaticamente
- **Containerizado**: Docker + Docker Compose
- **Banco de Dados**: PostgreSQL com migrações automáticas
- **Cache**: Redis para performance

## 🏗️ Arquitetura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Nginx       │────│   Frontend      │────│    Backend      │
│  (Proxy/SSL)    │    │   (React)       │    │   (Node.js)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                       ┌─────────────────┐    ┌─────────────────┐
                       │     Redis       │    │   PostgreSQL    │
                       │    (Cache)      │    │  (Database)     │
                       └─────────────────┘    └─────────────────┘
```

## 🔧 Requisitos do Sistema

### Produção
- Ubuntu 22.04 LTS
- 2GB RAM mínimo (4GB recomendado)
- 20GB espaço em disco
- Domínio próprio com acesso DNS
- Portas 80, 443 e 22 abertas

### Desenvolvimento
- Node.js 18+
- npm ou yarn
- Docker (opcional)

## 🚀 Deploy Rápido

1. **Servidor**: Prepare um servidor Ubuntu 22.04
2. **Domínio**: Configure registros DNS apontando para o servidor
3. **Instalação**: Execute `./install.sh` como root
4. **Configuração**: Siga o assistente interativo
5. **Acesso**: Acesse via HTTPS com certificado automático

## 🔐 Segurança

- Certificados SSL automáticos (Let's Encrypt)
- Headers de segurança configurados
- Rate limiting no Nginx
- Containers isolados
- Senhas geradas automaticamente
- Backup automático configurado

## 📞 Suporte

- **Issues**: [GitHub Issues](https://github.com/seu-usuario/nowhats/issues)
- **Documentação**: Consulte os arquivos de documentação
- **Troubleshooting**: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](./LICENSE) para mais detalhes.

---

**Desenvolvido com ❤️ para facilitar o atendimento via WhatsApp**