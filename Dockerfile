FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV AUTH_SECRET=build-placeholder
ENV AUTH_TRUST_HOST=true
RUN npx prisma generate && npm run build
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
