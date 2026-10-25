package handlers

import (
	"fmt"
	"net/http"
	"strings"

	"alfabank-credit-conveyor/internal/conveyor"
	"alfabank-credit-conveyor/internal/store"
)

// ClarificationsRouter — /api/clarifications/{id}/respond
func (h *Handler) ClarificationsRouter(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "Метод не поддерживается")
		return
	}
	path := r.URL.Path
	for _, prefix := range []string{"/api/v1/clarifications/", "/api/clarifications/"} {
		if strings.HasPrefix(path, prefix) {
			path = strings.TrimPrefix(path, prefix)
			break
		}
	}
	// path = "{id}/respond"
	parts := strings.SplitN(strings.Trim(path, "/"), "/", 2)
	clarifID := parts[0]
	subPath := ""
	if len(parts) > 1 {
		subPath = parts[1]
	}
	if subPath != "respond" {
		writeError(w, http.StatusNotFound, "Эндпоинт не найден")
		return
	}
	h.RespondClarification(w, r, clarifID)
}

func (h *Handler) RespondClarification(w http.ResponseWriter, r *http.Request, clarifID string) {
	var req struct {
		ResponseText string   `json:"response_text"`
		DocumentIDs  []string `json:"document_ids"`
	}
	if err := parseJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "Ошибка разбора JSON")
		return
	}

	clarif, ok := h.DB.GetClarification(clarifID)
	if !ok {
		writeError(w, http.StatusNotFound, "Запрос уточнения не найден")
		return
	}

	clarif.Status = "RESPONDED"
	clarif.ResponseText = &req.ResponseText
	if req.DocumentIDs != nil {
		clarif.DocumentIDs = req.DocumentIDs
	} else {
		clarif.DocumentIDs = []string{}
	}
	h.DB.SetClarification(clarif)

	// Обновляем заявку
	app, ok := h.DB.GetApplication(clarif.ApplicationID)
	if ok {
		oldState := string(app.State)
		app.State = conveyor.StateResubmitted
		app.AuditLog = append(app.AuditLog, store.AuditLogEntry{
			ID: newStoreUUID(), ApplicationID: app.ID,
			FromState: &oldState, ToState: string(conveyor.StateResubmitted),
			Trigger: string(conveyor.TriggerClientResponded), ActorType: string(conveyor.ActorClientOwner),
			ActorID: &app.OwnerUserID,
			DetailsJSON: map[string]interface{}{
				"clarification_id": clarifID, "response": req.ResponseText,
			},
			CreatedAt: nowStr(),
		})
		// Обновляем уточнение внутри заявки
		for i, c := range app.Clarifications {
			if c.ID == clarifID {
				app.Clarifications[i] = clarif
				break
			}
		}
		app.UpdatedAt = nowStr()
		h.DB.SetApplication(app)
	}

	newState := ""
	if ok {
		newState = string(app.State)
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"clarification_id":      clarifID,
		"status":                "RESPONDED",
		"application_new_state": newState,
	})
}

// UnderwriterRouter — /api/underwriter/...
func (h *Handler) UnderwriterRouter(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path
	for _, prefix := range []string{"/api/v1/underwriter/", "/api/underwriter/"} {
		if strings.HasPrefix(path, prefix) {
			path = strings.TrimPrefix(path, prefix)
			break
		}
	}
	path = strings.Trim(path, "/")

	switch {
	case path == "queue" && r.Method == http.MethodGet:
		h.GetUnderwriterQueue(w, r)
	case strings.HasPrefix(path, "applications/") && strings.HasSuffix(path, "/decide"):
		if r.Method != http.MethodPost {
			writeError(w, http.StatusMethodNotAllowed, "Метод не поддерживается")
			return
		}
		// applications/{id}/decide
		inner := strings.TrimPrefix(path, "applications/")
		inner = strings.TrimSuffix(inner, "/decide")
		h.UnderwriterDecide(w, r, inner)
	default:
		writeError(w, http.StatusNotFound, "Эндпоинт не найден: "+path)
	}
}

func (h *Handler) GetUnderwriterQueue(w http.ResponseWriter, r *http.Request) {
	var result []map[string]interface{}
	for _, app := range h.DB.ListApplications() {
		if app.State == conveyor.StateManualReview ||
			app.State == conveyor.StateResubmitted ||
			app.State == conveyor.StateNeedClarification {

			riskGrade := "C"
			riskScore := 500
			var softFlags []string

			if app.ScoringResult != nil {
				riskGrade = string(app.ScoringResult.RiskGrade)
				riskScore = app.ScoringResult.RiskScore
			}
			if app.DecisionResult != nil {
				softFlags = app.DecisionResult.SoftFlags
			}
			if softFlags == nil {
				softFlags = []string{}
			}

			result = append(result, map[string]interface{}{
				"id":               app.ID,
				"company_name":     app.Company.Name,
				"inn":              app.Company.INN,
				"product_type":     app.ProductType,
				"requested_amount": app.RequestedAmount,
				"risk_grade":       riskGrade,
				"risk_score":       riskScore,
				"state":            string(app.State),
				"soft_flags":       softFlags,
				"created_at":       app.CreatedAt,
			})
		}
	}
	if result == nil {
		result = []map[string]interface{}{}
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"applications": result})
}

func (h *Handler) UnderwriterDecide(w http.ResponseWriter, r *http.Request, appID string) {
	var req struct {
		Action         string                   `json:"action"`
		Comment        string                   `json:"comment"`
		OverrideOffers []map[string]interface{} `json:"override_offers"`
	}
	if err := parseJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "Ошибка разбора JSON")
		return
	}

	app, ok := h.DB.GetApplication(appID)
	if !ok {
		writeError(w, http.StatusNotFound, "Заявка не найдена")
		return
	}

	actionMap := map[string]struct {
		trigger conveyor.Trigger
		state   conveyor.AppState
	}{
		"APPROVE":               {conveyor.TriggerUnderwriterApprove, conveyor.StateApproved},
		"REJECT":                {conveyor.TriggerUnderwriterReject, conveyor.StateRejected},
		"COUNTER_OFFER":         {conveyor.TriggerUnderwriterCounterOffer, conveyor.StateCounterOffer},
		"REQUEST_CLARIFICATION": {conveyor.TriggerRequestClarification, conveyor.StateNeedClarification},
	}

	action := strings.ToUpper(req.Action)
	mapping, valid := actionMap[action]
	if !valid {
		writeError(w, http.StatusBadRequest, "Недопустимое действие '"+action+"'. Допустимые: APPROVE, REJECT, COUNTER_OFFER, REQUEST_CLARIFICATION")
		return
	}

	oldState := string(app.State)
	entryID := newStoreUUID()

	app.State = mapping.state
	app.AuditLog = append(app.AuditLog, store.AuditLogEntry{
		ID: entryID, ApplicationID: appID,
		FromState: &oldState, ToState: string(mapping.state),
		Trigger: string(mapping.trigger), ActorType: string(conveyor.ActorBankUnderwriter),
		ActorID: strP("underwriter_user"),
		DetailsJSON: map[string]interface{}{"comment": req.Comment, "action": action},
		CreatedAt:   nowStr(),
	})
	app.UpdatedAt = nowStr()
	h.DB.SetApplication(app)

	if action == "REQUEST_CLARIFICATION" {
		clarifID := newStoreUUID()
		clarif := store.Clarification{
			ID: clarifID, ApplicationID: appID,
			QuestionText:         req.Comment,
			RequiredDocumentType: "OTHER",
			Status:               "PENDING",
			CreatedAt:            nowStr(),
			DocumentIDs:          []string{},
		}
		if clarif.QuestionText == "" {
			clarif.QuestionText = "Предоставьте дополнительные пояснения"
		}
		h.DB.SetClarification(clarif)
		app.Clarifications = append(app.Clarifications, clarif)
		h.DB.SetApplication(app)
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"application_id":     appID,
		"new_state":          string(mapping.state),
		"audit_log_entry_id": entryID,
		"action":             action,
	})
}

// GetNews — GET /api/news?okved_prefix=56
func (h *Handler) GetNews(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "Метод не поддерживается")
		return
	}
	okved := r.URL.Query().Get("okved_prefix")
	if okved == "" {
		okved = "ALL"
	}
	items := conveyor.GetNewsForOkved(okved)
	if items == nil {
		items = []conveyor.NewsItem{}
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"items": items})
}

// AIChat — POST /api/ai/chat
func (h *Handler) AIChat(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "Метод не поддерживается")
		return
	}
	var req struct {
		Message       string  `json:"message"`
		ApplicationID *string `json:"application_id"`
	}
	if err := parseJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "Ошибка разбора JSON")
		return
	}
	if req.Message == "" {
		writeError(w, http.StatusBadRequest, "Поле message обязательно")
		return
	}

	ans := conveyor.AIFallbackAnswer(req.Message)

	// Добавляем контекст заявки если указан ID
	if req.ApplicationID != nil && *req.ApplicationID != "" {
		app, ok := h.DB.GetApplication(*req.ApplicationID)
		if ok && app.ScoringResult != nil {
			ans["context_hint"] = "Текущий кредитный рейтинг компании: Grade " +
				string(app.ScoringResult.RiskGrade) + " (Score " +
				strings.TrimRight(strings.TrimRight(
					fmt.Sprintf("%.0f", float64(app.ScoringResult.RiskScore)), "0"), ".") + "/1000)."
		}
	}

	writeJSON(w, http.StatusOK, ans)
}

// MocksRouter — /api/mocks/{service}/{inn}
func (h *Handler) MocksRouter(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path
	for _, prefix := range []string{"/api/v1/mocks/", "/api/mocks/"} {
		if strings.HasPrefix(path, prefix) {
			path = strings.TrimPrefix(path, prefix)
			break
		}
	}
	parts := strings.SplitN(strings.Trim(path, "/"), "/", 2)
	if len(parts) < 2 {
		writeError(w, http.StatusBadRequest, "Укажите сервис и ИНН")
		return
	}
	service := parts[0]
	inn := parts[1]

	// Поиск пресета по ИНН
	var matched *conveyor.SyntheticPreset
	for _, p := range h.DB.Presets {
		if p.Company != nil && p.Company.INN == inn {
			cp := p
			matched = &cp
			break
		}
	}

	switch service {
	case "egrul":
		if matched != nil && matched.Enrichment != nil {
			writeJSON(w, http.StatusOK, map[string]interface{}{
				"inn": matched.Company.INN, "ogrn": matched.Company.OGRN,
				"name": matched.Company.Name, "full_name": matched.Company.FullName,
				"legal_form": matched.Company.LegalForm, "okved_main": matched.Company.OkvedMain,
				"registration_date": matched.Company.RegistrationDate,
				"authorized_capital": matched.Company.AuthorizedCapital,
				"employee_count": matched.Company.EmployeeCount,
				"is_liquidating": matched.Enrichment.Egrul.IsLiquidating,
				"founders": matched.Enrichment.Egrul.Founders,
			})
		} else {
			writeJSON(w, http.StatusOK, map[string]interface{}{
				"inn": inn, "ogrn": "1207700" + safeSuffix(inn, 6),
				"name": "ООО «Партнёр-" + safeSuffix(inn, 4) + "»",
				"full_name": "Общество с ограниченной ответственностью «Партнёр-" + safeSuffix(inn, 4) + "»",
				"legal_form": legalFormForINN(inn), "okved_main": "46.90",
				"registration_date": "2020-03-10",
				"authorized_capital": 50_000.0, "employee_count": 15,
				"is_liquidating": false, "founders": []map[string]interface{}{{"name": "Петров А.А.", "share_pct": 100}},
			})
		}
	case "fns":
		if matched != nil && matched.Enrichment != nil {
			writeJSON(w, http.StatusOK, matched.Enrichment.Fns)
		} else {
			writeJSON(w, http.StatusOK, map[string]interface{}{
				"tax_blocks": []map[string]string{}, "tax_discrepancies": 0, "employee_count": 15, "status": "CLEAR",
			})
		}
	case "bki":
		if matched != nil && matched.Enrichment != nil {
			writeJSON(w, http.StatusOK, matched.Enrichment.Bki)
		} else {
			writeJSON(w, http.StatusOK, map[string]interface{}{
				"active_loans": 1, "total_monthly_payment": 45_000.0,
				"overdue_0": true, "overdue_30": false, "overdue_60": false, "overdue_90_plus": false,
				"credit_history_months": 36,
			})
		}
	case "news":
		items := conveyor.GetNewsForOkved(inn) // тут inn = okved
		writeJSON(w, http.StatusOK, map[string]interface{}{"items": items})
	default:
		writeError(w, http.StatusNotFound, "Сервис не найден: "+service)
	}
}

func safeSuffix(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[len(s)-n:]
}

func legalFormForINN(inn string) string {
	if len(inn) == 12 {
		return "IP"
	}
	return "OOO"
}

func fmt_sprintf_zero(v int) string {
	return strings.TrimRight(strings.TrimRight(
		strings.Replace(strings.Replace(
			strings.TrimRight(strings.TrimRight(
				string(rune('0'+v)), ""), ""), ".", "", 1), ",", "", 1), "0"), ".")
}
