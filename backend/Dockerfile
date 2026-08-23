FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci && npm cache clean --force

COPY --chown=node:node . .

RUN npx prisma generate
RUN mkdir -p /app/data /app/backups && chown -R node:node /app/data /app/backups

USER node

EXPOSE 3000

CMD ["node", "src/server.js"]
