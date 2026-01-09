FROM node:24-alpine AS builder

WORKDIR /app

# copy package files first for better caching
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM node:24-alpine

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist

RUN npm install --omit=dev

# create the upload directory (this will be linked to the Docker volume)
RUN mkdir -p /app/uploads

EXPOSE 3000

CMD ["node", "dist/main"]