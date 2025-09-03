# Dockerfile para Evolution API
FROM node:18-alpine

# Instalar dependências do sistema necessárias para Puppeteer
RUN apk add --no-cache \
    git \
    curl \
    wget \
    python3 \
    make \
    g++ \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Definir variáveis de ambiente para Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Definir diretório de trabalho
WORKDIR /app

# Copiar package.json da Evolution API
COPY package.json ./

# Instalar dependências
RUN npm install --production

# Copiar código da aplicação
COPY server.js ./

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S evolution -u 1001 -G nodejs

# Criar diretórios necessários
RUN mkdir -p /app/instances /app/store /app/uploads /app/logs

# Definir permissões
RUN chown -R evolution:nodejs /app
USER evolution

# Expor porta
EXPOSE 8080

# Comando de inicialização
CMD ["npm", "run", "start:prod"]