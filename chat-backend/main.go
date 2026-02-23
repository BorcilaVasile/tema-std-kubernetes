package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"

	"chat-backend/handlers"
	"chat-backend/models"
	"chat-backend/ws"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	mongoURI := os.Getenv("MONGODB_URI")
	if mongoURI == "" {
		mongoURI = "mongodb://localhost:27017"
	}

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatalf("Error connecting to MongoDB: %v", err)
	}
	defer client.Disconnect(ctx)

	err = client.Ping(ctx, nil)
	if err != nil {
		log.Fatalf("Could not connect to MongoDB: %v", err)
	}
	log.Println("Connected to MongoDB successfully")

	db := client.Database("chatapp")
	messagesCollection := db.Collection("messages")
	usersCollection := db.Collection("users")

	messageStore := models.NewMessageStore(messagesCollection)
	userStore := models.NewUserStore(usersCollection)

	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		redisAddr = "redis-service:6379"
	}
	pool := ws.NewPool(redisAddr)
	go pool.Start()

	chatHandler := handlers.NewChatHandler(pool, messageStore)

	http.HandleFunc("/ws", chatHandler.HandleWebSocket)
	http.HandleFunc("/messages", chatHandler.HandleMessages)
	http.HandleFunc("/chatapi/ws", chatHandler.HandleWebSocket)
	http.HandleFunc("/chatapi/messages", chatHandler.HandleMessages)

	http.HandleFunc("/users", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		if r.Method != "POST" {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var data struct {
			Username string `json:"username"`
		}

		if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
			log.Printf("Error decoding user data: %v", err)
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		if data.Username == "" {
			http.Error(w, "Username is required", http.StatusBadRequest)
			return
		}

		user, err := userStore.AddUser(data.Username)
		if err != nil {
			log.Printf("Error adding user: %v", err)
			http.Error(w, "Error adding user", http.StatusInternalServerError)
			return
		}

		json.NewEncoder(w).Encode(user)
	})

	http.HandleFunc("/", enableCORS)

	port := os.Getenv("PORT")
	if port == "" {
		port = "88"
	}

	log.Printf("Server starting on port %s", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatalf("Error starting server: %v", err)
	}
}

// Simple CORS middleware
func enableCORS(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	http.NotFound(w, r)
}
