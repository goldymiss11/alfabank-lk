# Multi-stage build for lightweight, secure Go backend
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Download dependencies (only stdlib, minimal cache)
COPY go.mod ./
RUN go mod download || true

# Copy source code
COPY . .

# Build statically linked binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/conveyor-server .

# Production runner image
FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/conveyor-server /app/conveyor-server

# Create uploads directory
RUN mkdir -p /app/uploads
COPY uploads/ /app/uploads/

ENV PORT=8000
ENV UPLOAD_DIR=/app/uploads

EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8000/health || exit 1

ENTRYPOINT ["/app/conveyor-server"]
