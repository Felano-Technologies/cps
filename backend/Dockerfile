FROM node:20-slim

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/package*.json ./
RUN npm install

COPY backend/ .

RUN npx prisma generate

ENV NODE_ENV=production

EXPOSE 3000

CMD npx prisma migrate deploy && npm run prisma:seed && npm start
