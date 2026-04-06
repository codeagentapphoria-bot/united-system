FROM node:20-slim

# Install Go to build proc-compose and merge-port
RUN apt-get update && apt-get install -y curl ca-certificates redis-server && \
    curl -fsSL https://go.dev/dl/go1.22.4.linux-amd64.tar.gz | tar -C /usr/local -xz
ENV PATH="/usr/local/go/bin:/root/go/bin:$PATH"

# Install proc-compose and merge-port
RUN go install github.com/anivaryam/proc-compose/cmd/proc-compose@v0.5.2 && \
    go install github.com/anivaryam/merge-port/cmd/merge-port@v0.3.0

WORKDIR /app
COPY . .

# Install backend dependencies and compile TypeScript → dist/
RUN cd multysis-backend && npm ci && npm run build

# Install frontend dependencies and build Vite app.
# VITE_API_BASE_URL must be set in the Railway environment variables dashboard
# before deploying so it gets baked into the frontend build:
#   VITE_API_BASE_URL = https://${{RAILWAY_PUBLIC_DOMAIN}}/api
RUN cd multysis-frontend && npm ci && npm run build

CMD ["proc-compose", "up", "-f", "proc-compose.prod.yml", "--no-color"]
