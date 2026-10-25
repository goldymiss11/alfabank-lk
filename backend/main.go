package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"

	"alfabank-credit-conveyor/internal/handlers"
	"alfabank-credit-conveyor/internal/store"
)

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-User-Id, X-User-Role")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8000"
	}

	uploadDir := os.Getenv("UPLOAD_DIR")
	if uploadDir == "" {
		uploadDir = "uploads"
	}
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		log.Fatalf("uploads dir error: %v", err)
	}
	absUploadDir, _ := filepath.Abs(uploadDir)

	db := store.NewDB()

	if _, err := db.LoadPreset("coffee_shop_ip"); err != nil {
		log.Printf("preset warning: %v", err)
	}

	mux := http.NewServeMux()
	h := handlers.New(db, absUploadDir)
	h.RegisterRoutes(mux)

	handler := corsMiddleware(mux)

	log.Printf("Server listening on :%s", port)

	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
