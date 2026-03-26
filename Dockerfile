FROM node:20-alpine
WORKDIR /app

# Instalar pnpm globalmente
RUN npm install -g pnpm@10.4.1

# Copiar ficheiros de dependências e patches (necessários antes do pnpm install)
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# Instalar dependências com pnpm (frozen lockfile para reprodutibilidade)
RUN pnpm install --frozen-lockfile

# Copiar o restante do código
COPY . .

# Fazer build (vite + esbuild → dist/index.js)
RUN pnpm run build

# Expor porta
EXPOSE 3000

# Iniciar o servidor
CMD ["node", "dist/index.js"]
