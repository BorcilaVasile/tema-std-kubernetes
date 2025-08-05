package models

import (
    "context"
    "errors"
    "time"

    "go.mongodb.org/mongo-driver/bson"
    "go.mongodb.org/mongo-driver/bson/primitive"
    "go.mongodb.org/mongo-driver/mongo"
)

// User represents a chat user
type User struct {
    ID        primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
    Username  string             `bson:"username" json:"username"`
    CreatedAt time.Time          `bson:"createdAt" json:"createdAt"`
}

// UserStore manages user storage with MongoDB
type UserStore struct {
    collection *mongo.Collection
}

// NewUserStore creates a new user store
func NewUserStore(collection *mongo.Collection) *UserStore {
    return &UserStore{
        collection: collection,
    }
}

// AddUser adds a user to MongoDB
func (store *UserStore) AddUser(username string) (User, error) {
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    // Check if username already exists
    var existingUser User
    err := store.collection.FindOne(ctx, bson.M{"username": username}).Decode(&existingUser)
    if err == nil {
        // Username already exists, return existing user
        return existingUser, nil
    } else if err != mongo.ErrNoDocuments {
        // Some other error occurred
        return User{}, err
    }

    // Create new user
    user := User{
        ID:        primitive.NewObjectID(),
        Username:  username,
        CreatedAt: time.Now(),
    }

    // Insert into MongoDB
    _, err = store.collection.InsertOne(ctx, user)
    if err != nil {
        return User{}, err
    }

    return user, nil
}

// GetUserByUsername retrieves a user by username
func (store *UserStore) GetUserByUsername(username string) (User, error) {
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    var user User
    err := store.collection.FindOne(ctx, bson.M{"username": username}).Decode(&user)
    if err != nil {
        if err == mongo.ErrNoDocuments {
            return User{}, errors.New("user not found")
        }
        return User{}, err
    }

    return user, nil
}