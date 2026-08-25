FROM node:20-slim

WORKDIR /app

COPY backend/package*.json ./
RUN npm install

COPY backend/ .

RUN npx prisma generate

ENV NODE_ENV=production

EXPOSE 3000

CMD npx prisma migrate deploy && npm start
