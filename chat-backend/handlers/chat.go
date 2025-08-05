package handlers

import (
    "encoding/json"
    "log"
    "net/http"

    "chat-backend/models"
    "chat-backend/ws"

    "github.com/google/uuid"
    "github.com/gorilla/websocket"
)

// ChatHandler handles WebSocket connections and message broadcasting
type ChatHandler struct {
    upgrader     websocket.Upgrader
    pool         *ws.Pool
    messageStore *models.MessageStore
}

// NewChatHandler creates a new chat handler
func NewChatHandler(pool *ws.Pool, messageStore *models.MessageStore) *ChatHandler {
    return &ChatHandler{
        upgrader: websocket.Upgrader{
            ReadBufferSize:  1024,
            WriteBufferSize: 1024,
            CheckOrigin: func(r *http.Request) bool {
                return true // Allow all origins for development
            },
        },
        pool:         pool,
        messageStore: messageStore,
    }
}

// HandleWebSocket upgrades HTTP connection to WebSocket
func (h *ChatHandler) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
    conn, err := h.upgrader.Upgrade(w, r, nil)
    if err != nil {
        log.Printf("Error upgrading to WebSocket: %v", err)
        return
    }

    client := &ws.Client{
        ID:   uuid.New().String(),
        Conn: conn,
        Pool: h.pool,
    }

    // Register client to pool
    h.pool.Register <- client

    // Start reading messages from this client
    go h.readMessages(client)
}

// GetMessages returns all stored messages
func (h *ChatHandler) GetMessages(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    w.Header().Set("Access-Control-Allow-Origin", "*")

    messages, err := h.messageStore.GetMessages()
    if err != nil {
        log.Printf("Error retrieving messages: %v", err)
        http.Error(w, "Error retrieving messages", http.StatusInternalServerError)
        return
    }

    if err := json.NewEncoder(w).Encode(messages); err != nil {
        log.Printf("Error encoding messages: %v", err)
        http.Error(w, "Error retrieving messages", http.StatusInternalServerError)
        return
    }
}

// readMessages reads messages from the client and broadcasts them
func (h *ChatHandler) readMessages(client *ws.Client) {
    defer func() {
        client.Conn.Close()
        h.pool.Unregister <- client
    }()

    for {
        _, p, err := client.Conn.ReadMessage()
        if err != nil {
            log.Printf("Error reading message: %v", err)
            return
        }

        // Parse message
        var message models.Message
        if err := json.Unmarshal(p, &message); err != nil {
            log.Printf("Error unmarshaling message: %v", err)
            continue
        }

        // Store message in MongoDB
        storedMessage, err := h.messageStore.AddMessage(message)
        if err != nil {
            log.Printf("Error storing message: %v", err)
            continue
        }

        // Broadcast message
        messageJSON, err := json.Marshal(storedMessage)
        if err != nil {
            log.Printf("Error marshaling message: %v", err)
            continue
        }

        h.pool.Broadcast <- messageJSON
    }
}