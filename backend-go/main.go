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
	// Создаём папку uploads если нет
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		log.Fatalf("Не удалось создать папку uploads: %v", err)
	}
	absUploadDir, _ := filepath.Abs(uploadDir)

	// Инициализация БД
	db := store.NewDB()

	// Загружаем дефолтный пресет при старте
	if _, err := db.LoadPreset("coffee_shop_ip"); err != nil {
		log.Printf("Предупреждение: не удалось загрузить начальный пресет: %v", err)
	} else {
		log.Println("✅ Пресет 'coffee_shop_ip' загружен")
	}

	// Регистрация роутов
	mux := http.NewServeMux()
	h := handlers.New(db, absUploadDir)
	h.RegisterRoutes(mux)

	// CORS
	handler := corsMiddleware(mux)

	log.Printf("🚀 Кредитный конвейер АльфаБанк запущен на :%s", port)
	log.Printf("📁 Загрузки: %s", absUploadDir)
	log.Printf("🔗 API: http://localhost:%s/api/v1", port)
	log.Printf("❤️  Health: http://localhost:%s/health", port)

	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatalf("Ошибка сервера: %v", err)
	}
}
