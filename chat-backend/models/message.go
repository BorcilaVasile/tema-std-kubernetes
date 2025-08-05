package models

import (
    "context"
    "sync"
    "time"

    "go.mongodb.org/mongo-driver/bson"
    "go.mongodb.org/mongo-driver/bson/primitive"
    "go.mongodb.org/mongo-driver/mongo"
    "go.mongodb.org/mongo-driver/mongo/options" // Add this import
)

// Message represents a chat message
type Message struct {
    ID        primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
    Text      string             `bson:"text" json:"text"`
    Sender    string             `bson:"sender" json:"sender"`
    Timestamp time.Time          `bson:"timestamp" json:"timestamp"`
}

// MessageStore manages message storage with MongoDB
type MessageStore struct {
    collection *mongo.Collection
    mutex      sync.RWMutex
}

// NewMessageStore creates a new message store
func NewMessageStore(collection *mongo.Collection) *MessageStore {
    return &MessageStore{
        collection: collection,
    }
}

// AddMessage adds a message to MongoDB
func (store *MessageStore) AddMessage(message Message) (Message, error) {
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    // Set ObjectID if not set and ensure timestamp
    if message.ID.IsZero() {
        message.ID = primitive.NewObjectID()
    }
    if message.Timestamp.IsZero() {
        message.Timestamp = time.Now()
    }

    // Insert into MongoDB
    _, err := store.collection.InsertOne(ctx, message)
    if err != nil {
        return Message{}, err
    }

    return message, nil
}

// GetMessages returns all messages from MongoDB
func (store *MessageStore) GetMessages() ([]Message, error) {
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    // Find all messages, sorted by timestamp
    opts := options.Find().SetSort(bson.D{{Key: "timestamp", Value: 1}})
    cursor, err := store.collection.Find(ctx, bson.D{}, opts)
    if err != nil {
        return nil, err
    }
    defer cursor.Close(ctx)

    // Decode all messages
    var messages []Message
    if err = cursor.All(ctx, &messages); err != nil {
        return nil, err
    }

    return messages, nil
}