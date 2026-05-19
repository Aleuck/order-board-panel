FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

EXPOSE 5173

CMD ["sh", "-c", "pnpm install && pnpm dev --host 0.0.0.0"]
