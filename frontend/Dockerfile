FROM node:22-alpine AS builder

ENV NODE_ENV=production
ENV CI=true

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

COPY frontend/package.json ./frontend/

RUN npm install -g pnpm

RUN pnpm install  --filter frontend --frozen-lockfile

COPY frontend ./frontend

WORKDIR /app/frontend

RUN pnpm build

RUN pnpm prune --prod --ignore-scripts

FROM nginx:alpine AS production

RUN apk add --no-cache dumb-init


COPY --from=builder /app/frontend/dist /usr/share/nginx/html

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

COPY frontend/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh


EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]

CMD ["nginx", "-g", "daemon off;"]
