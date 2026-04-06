FROM golang:1.25-bookworm AS tools
RUN go install github.com/anivaryam/proc-compose/cmd/proc-compose@v0.5.2 && \
    go install github.com/anivaryam/merge-port/cmd/mergeport@v0.3.0

FROM node:22-slim
RUN apt-get update && apt-get install -y redis-server && rm -rf /var/lib/apt/lists/*
COPY --from=tools /go/bin/proc-compose /usr/local/bin/
COPY --from=tools /go/bin/mergeport /usr/local/bin/merge-port

WORKDIR /app
COPY . .

# Install all workspace dependencies from root, generate Prisma client, then build
RUN npm ci
RUN cd multysis-backend && npx prisma generate && npm run build
RUN cd multysis-frontend && npm run build

CMD ["proc-compose", "up", "-f", "proc-compose.prod.yml", "--no-color"]
