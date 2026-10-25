package handlers

import (
	"encoding/json"
	"net/http"

	"alfabank-credit-conveyor/internal/store"
)

type Handler struct {
	DB        *store.DB
	UploadDir string
}

func New(db *store.DB, uploadDir string) *Handler {
	return &Handler{DB: db, UploadDir: uploadDir}
}

func (h *Handler) RegisterRoutes(mux *http.ServeMux) {

	mux.HandleFunc("/health", h.Health)

	mux.HandleFunc("/api/presets", h.GetPresets)
	mux.HandleFunc("/api/v1/presets", h.GetPresets)

	mux.HandleFunc("/api/presets/", h.PresetsRouter)
	mux.HandleFunc("/api/v1/presets/", h.PresetsRouter)

	mux.HandleFunc("/api/applications", h.ApplicationsRouter)
	mux.HandleFunc("/api/v1/applications", h.ApplicationsRouter)
	mux.HandleFunc("/api/applications/", h.ApplicationsSubRouter)
	mux.HandleFunc("/api/v1/applications/", h.ApplicationsSubRouter)

	mux.HandleFunc("/api/clarifications/", h.ClarificationsRouter)
	mux.HandleFunc("/api/v1/clarifications/", h.ClarificationsRouter)

	mux.HandleFunc("/api/underwriter/", h.UnderwriterRouter)
	mux.HandleFunc("/api/v1/underwriter/", h.UnderwriterRouter)

	mux.HandleFunc("/api/ai/chat", h.AIChat)
	mux.HandleFunc("/api/v1/ai/chat", h.AIChat)
	mux.HandleFunc("/api/ai/recommend", h.AIChat)
	mux.HandleFunc("/api/v1/ai/recommend", h.AIChat)

	mux.HandleFunc("/api/news", h.GetNews)
	mux.HandleFunc("/api/v1/news", h.GetNews)

	mux.HandleFunc("/api/mocks/", h.MocksRouter)
	mux.HandleFunc("/api/v1/mocks/", h.MocksRouter)

	mux.Handle("/uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir(h.UploadDir))))
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"detail": msg})
}

func parseJSON(r *http.Request, v interface{}) error {
	defer r.Body.Close()
	return json.NewDecoder(r.Body).Decode(v)
}

func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"status":              "ok",
		"active_preset":       h.DB.ActivePresetID,
		"applications_count":  len(h.DB.Applications),
	})
}

