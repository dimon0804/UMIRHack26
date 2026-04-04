# Build (Node 20 LTS — чаще кэшируется; см. README при ошибках pull с Docker Hub)
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
ARG VITE_API_URL=
ARG VITE_USE_GATEWAY=true
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_USE_GATEWAY=$VITE_USE_GATEWAY
RUN npm run build

# Static + reverse proxy: тот же базовый образ, nginx через apk (Alpine CDN).
# Отдельный pull `nginx:alpine` с Docker Hub не нужен — меньше сбоев при TLS timeout к registry-1.docker.io.
FROM node:20-alpine
RUN apk add --no-cache nginx
COPY nginx.conf /etc/nginx/http.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
