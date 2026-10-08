# DEPLOYMENT GUIDE

This guide details deploying Aether Messenger into containerized environments (Docker, Kubernetes, Cloud Run) behind Nginx or Caddy reverse proxies with HTTPS and WebSockets.

## 1. Dockerfile Production Build

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/src/types ./src/types
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/public ./public
RUN npm install -g tsx

EXPOSE 3000
CMD ["tsx", "server.ts"]
```

## 2. Nginx Reverse Proxy with WebSockets & TLS

```nginx
server {
    listen 80;
    server_name messenger.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name messenger.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/messenger.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/messenger.yourdomain.com/privkey.pem;

    # HSTS & Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```
