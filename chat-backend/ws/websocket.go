package ws

import (
	"context"
	"log"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/redis/go-redis/v9"
)

const redisChannel = "chat:messages"

// Client represents a connected websocket client
type Client struct {
	ID   string
	Conn *websocket.Conn
	Pool *Pool
}

// Pool maintains the set of active clients and broadcasts messages
type Pool struct {
	Register   chan *Client
	Unregister chan *Client
	Clients    map[*Client]bool
	Broadcast  chan []byte
	mutex      sync.Mutex
	rdb        *redis.Client
	ctx        context.Context
}

// NewPool creates a new client pool with Redis pub/sub for cross-pod sync
func NewPool(redisAddr string) *Pool {
	if redisAddr == "" {
		redisAddr = "redis-service:6379"
	}

	rdb := redis.NewClient(&redis.Options{
		Addr: redisAddr,
	})

	return &Pool{
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
		Clients:    make(map[*Client]bool),
		Broadcast:  make(chan []byte),
		rdb:        rdb,
		ctx:        context.Background(),
	}
}

// Start runs the pool goroutine
func (pool *Pool) Start() {
	go pool.subscribeRedis()

	for {
		select {
		case client := <-pool.Register:
			pool.mutex.Lock()
			pool.Clients[client] = true
			pool.mutex.Unlock()
			log.Printf("Client %s connected. Total clients: %d", client.ID, len(pool.Clients))
		case client := <-pool.Unregister:
			pool.mutex.Lock()
			delete(pool.Clients, client)
			pool.mutex.Unlock()
			log.Printf("Client %s disconnected. Total clients: %d", client.ID, len(pool.Clients))
		case message := <-pool.Broadcast:
			err := pool.rdb.Publish(pool.ctx, redisChannel, message).Err()
			if err != nil {
				log.Printf("Error publishing to Redis: %v, falling back to local broadcast", err)
				pool.broadcastToLocal(message)
			}
		}
	}
}

// subscribeRedis listens for messages from Redis and broadcasts to local clients
func (pool *Pool) subscribeRedis() {
	sub := pool.rdb.Subscribe(pool.ctx, redisChannel)
	defer sub.Close()

	ch := sub.Channel()
	log.Println("Subscribed to Redis channel for cross-pod message sync")

	for msg := range ch {
		pool.broadcastToLocal([]byte(msg.Payload))
	}
}

// broadcastToLocal sends a message to all locally connected WebSocket clients
func (pool *Pool) broadcastToLocal(message []byte) {
	pool.mutex.Lock()
	defer pool.mutex.Unlock()

	for client := range pool.Clients {
		if err := client.Conn.WriteMessage(websocket.TextMessage, message); err != nil {
			log.Printf("Error broadcasting message to client %s: %v", client.ID, err)
			client.Conn.Close()
			delete(pool.Clients, client)
		}
	}
}
