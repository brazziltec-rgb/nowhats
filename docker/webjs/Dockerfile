# Dockerfile para Web.js API
FROM node:18-alpine

# Instalar dependências do sistema necessárias para Puppeteer
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
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    NODE_ENV=production

# Criar diretório de trabalho
WORKDIR /app

# Criar usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs && \
    adduser -S webjs -u 1001 -G nodejs

# Copiar package.json para instalar whatsapp-web.js
COPY docker/webjs/package.json ./

# Instalar dependências
RUN npm install

# Copiar código da aplicação Web.js
COPY docker/webjs/server.js ./

# Criar diretórios necessários
RUN mkdir -p /app/sessions /app/uploads /app/logs

# Definir permissões
RUN chown -R webjs:nodejs /app
USER webjs

# Expor porta
EXPOSE 3002

# Comando de inicialização
CMD ["node", "server.js"]