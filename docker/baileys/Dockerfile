# Dockerfile para Baileys API
FROM node:18-alpine

# Instalar dependências do sistema
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    python3 \
    make \
    g++ \
    git

# Definir variáveis de ambiente para Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Criar diretório de trabalho
WORKDIR /app

# Criar usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs
RUN adduser -S baileys -u 1001

# Copiar package.json e package-lock.json do backend
COPY backend/package*.json ./backend/

# Instalar dependências do backend
WORKDIR /app/backend
RUN npm install && npm cache clean --force

# Voltar para o diretório raiz e copiar código da aplicação
WORKDIR /app
COPY backend ./backend/
COPY docker/baileys ./

# Remover arquivo .env local para usar variáveis de ambiente do Docker
RUN rm -f /app/backend/.env

# Criar diretórios necessários
RUN mkdir -p /app/sessions /app/uploads /app/logs

# Definir permissões
RUN chown -R baileys:nodejs /app
USER baileys

# Expor porta
EXPOSE 3001

# Comando de inicialização
WORKDIR /app/backend
CMD ["npm", "start"]