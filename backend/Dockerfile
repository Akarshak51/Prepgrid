FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 5000) + '/api/health').then((res) => { if (!res.ok) process.exit(1); }).catch(() => process.exit(1));"

USER node
CMD ["node", "src/server.js"]
