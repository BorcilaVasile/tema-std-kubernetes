package ws

import (
    "log"
    "sync"

    "github.com/gorilla/websocket"
)

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
}

// NewPool creates a new client pool
func NewPool() *Pool {
    return &Pool{
        Register:   make(chan *Client),
        Unregister: make(chan *Client),
        Clients:    make(map[*Client]bool),
        Broadcast:  make(chan []byte),
    }
}

// Start runs the pool goroutine
func (pool *Pool) Start() {
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
            pool.mutex.Lock()
            for client := range pool.Clients {
                if err := client.Conn.WriteMessage(websocket.TextMessage, message); err != nil {
                    log.Printf("Error broadcasting message to client %s: %v", client.ID, err)
                    client.Conn.Close()
                    delete(pool.Clients, client)
                }
            }
            pool.mutex.Unlock()
        }
    }
}