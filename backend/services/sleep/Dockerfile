FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY ../../shared/prisma ./prisma/
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
RUN npx prisma generate
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs
EXPOSE 3002
HEALTHCHECK --interval=30s --timeout=3s CMD node -e "require('http').get('http://localhost:3002/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
CMD ["node", "dist/index.js"]
