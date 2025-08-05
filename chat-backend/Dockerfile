FROM golang:1.24.3-alpine AS build 

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -o chat-server .

# Schimbarea versiunii de Alpine
FROM alpine:3.17

WORKDIR /app

# Folosim --no-cache și repository-uri multiple pentru mai multă stabilitate
RUN apk update && apk --no-cache add ca-certificates

# Copiază executabilul din stagiul de build
COPY --from=build /app/chat-server .

# Copiază fișierul .env
COPY .env .

# Expune portul definit în .env (88)
EXPOSE 88

# Rulează aplicația
CMD ["./chat-server"]
