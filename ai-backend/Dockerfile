# Multi-stage pentru AI Backend  
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copiază toată aplicația
COPY . .

# Stage final - imagine minimă
FROM node:18-alpine

WORKDIR /app

# Copiază node_modules și package files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Copiază fișierele principale
COPY --from=builder /app/server.js ./
COPY --from=builder /app/test-connections.js ./
COPY --from=builder /app/database.sql ./
COPY --from=builder /app/.env ./

# Copiază folderele necesare
COPY --from=builder /app/config ./config/
COPY --from=builder /app/models ./models/
COPY --from=builder /app/routes ./routes/
COPY --from=builder /app/services ./services/

# Elimină cache și fișiere temporare
RUN npm cache clean --force && \
    rm -rf /tmp/* /var/cache/apk/* && \
    find /app -name "*.log" -delete 2>/dev/null || true

USER node
EXPOSE 3000

CMD ["npm", "start"]
