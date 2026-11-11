FROM node:24-alpine
WORKDIR /app

COPY package*.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
RUN npm install

COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
COPY database ./database
RUN npm run build:api

ENV NODE_ENV=production
EXPOSE 4000
CMD ["sh", "-c", "npm run db:migrate:prod -w @cloudbudget/api && npm run db:seed:prod -w @cloudbudget/api && npm run start -w @cloudbudget/api"]

