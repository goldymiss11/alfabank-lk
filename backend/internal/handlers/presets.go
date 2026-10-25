package handlers

import (
	"net/http"
	"strings"

	"alfabank-credit-conveyor/internal/conveyor"
	"alfabank-credit-conveyor/internal/store"
)

func (h *Handler) GetPresets(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "Метод не поддерживается")
		return
	}
	var list []map[string]interface{}
	for _, p := range h.DB.Presets {
		companyName := "Свой ввод"
		var inn interface{} = nil
		if p.Company != nil {
			companyName = p.Company.Name
			inn = p.Company.INN
		}
		list = append(list, map[string]interface{}{
			"preset_id":        p.PresetID,
			"label":            p.Label,
			"expected_outcome": p.ExpectedOutcome,
			"company_name":     companyName,
			"inn":              inn,
			"description":      "Ожидаемый исход: " + p.ExpectedOutcome,
		})
	}

	order := []string{"coffee_shop_ip", "manufacturing_ooo", "logistics_seasonal", "wholesale_rejected", "custom_input"}
	ordered := make([]map[string]interface{}, 0, len(list))
	for _, id := range order {
		for _, item := range list {
			if item["preset_id"] == id {
				ordered = append(ordered, item)
				break
			}
		}
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"presets":          ordered,
		"active_preset_id": h.DB.ActivePresetID,
	})
}

func (h *Handler) PresetsRouter(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "Метод не поддерживается")
		return
	}

	path := r.URL.Path
	for _, prefix := range []string{"/api/v1/presets/", "/api/presets/"} {
		if strings.HasPrefix(path, prefix) {
			path = strings.TrimPrefix(path, prefix)
			break
		}
	}

	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) < 1 || parts[0] == "" {
		writeError(w, http.StatusBadRequest, "Не указан ID пресета")
		return
	}
	presetID := parts[0]

	result, err := h.DB.LoadPreset(presetID)
	if err != nil {
		if _, ok := err.(store.StoreErr); ok {
			writeError(w, http.StatusNotFound, err.Error())
		} else {
			writeError(w, http.StatusInternalServerError, err.Error())
		}
		return
	}
	writeJSON(w, http.StatusCreated, result)
}

func (h *Handler) ApplicationsRouter(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.ListApplications(w, r)
	case http.MethodPost:
		h.CreateApplication(w, r)
	default:
		writeError(w, http.StatusMethodNotAllowed, "Метод не поддерживается")
	}
}

func (h *Handler) ListApplications(w http.ResponseWriter, r *http.Request) {
	apps := h.DB.ListApplications()
	if apps == nil {
		apps = []store.Application{}
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"applications": apps})
}

func (h *Handler) CreateApplication(w http.ResponseWriter, r *http.Request) {
	var req struct {
		CompanyID           *string `json:"company_id"`
		CompanyINN          *string `json:"company_inn"`
		ProductType         string  `json:"product_type"`
		RequestedAmount     float64 `json:"requested_amount"`
		RequestedTermMonths int     `json:"requested_term_months"`
		GovProgramID        *string `json:"gov_program_id"`
	}
	req.ProductType = "WORKING_CAPITAL_LOAN"
	req.RequestedAmount = 1_000_000
	req.RequestedTermMonths = 12

	if err := parseJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "Ошибка разбора JSON: "+err.Error())
		return
	}

	h.DB.Mu.Lock()
	defer h.DB.Mu.Unlock()

	compID := newStoreUUID()
	if req.CompanyID != nil && *req.CompanyID != "" {
		compID = *req.CompanyID
	}

	comp, exists := h.DB.Companies[compID]
	if !exists {
		inn := "7799001122"
		if req.CompanyINN != nil {
			inn = *req.CompanyINN
		}
		comp = store.Company{
			ID: compID, INN: inn, OGRN: "1207700112233",
			Name:      "ООО «Предприятие " + inn + "»",
			FullName:  "Общество с ограниченной ответственностью «Предприятие " + inn + "»",
			LegalForm: "OOO", OkvedMain: "46.90",
			OkvedDescription: "Торговля оптовая", RegistrationDate: "2021-01-15",
			AuthorizedCapital: func() *float64 { v := 100_000.0; return &v }(),
			Address:           "г. Москва", EmployeeCount: 10, IsActive: true,
		}
		h.DB.Companies[compID] = comp
	}

	ownerID := newStoreUUID()
	accountantID := newStoreUUID()
	appID := newStoreUUID()
	createdAt := nowStr()

	app := store.Application{
		ID: appID, CompanyID: compID, Company: comp,
		OwnerUserID: ownerID, AccountantUserID: accountantID,
		ProductType:         req.ProductType,
		RequestedAmount:     req.RequestedAmount,
		RequestedTermMonths: req.RequestedTermMonths,
		GovProgramID:        req.GovProgramID,
		State:               conveyor.StateDraft,
		Offers:              []conveyor.CreditOffer{},
		AuditLog: []store.AuditLogEntry{{
			ID: newStoreUUID(), ApplicationID: appID,
			ToState: string(conveyor.StateDraft),
			Trigger: "CREATE", ActorType: string(conveyor.ActorClientOwner),
			ActorID:     &ownerID,
			DetailsJSON: map[string]interface{}{"product_type": req.ProductType, "requested_amount": req.RequestedAmount},
			CreatedAt:   createdAt,
		}},
		Clarifications: []store.Clarification{},
		Documents:      []store.DocumentEntry{},
		CreatedAt:      createdAt, UpdatedAt: createdAt,
	}
	h.DB.Applications[appID] = app

	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"id": appID, "state": string(conveyor.StateDraft), "created_at": createdAt,
	})
}
