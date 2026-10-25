package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"alfabank-credit-conveyor/internal/conveyor"
	"alfabank-credit-conveyor/internal/store"
)

func (h *Handler) ApplicationsSubRouter(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path
	for _, prefix := range []string{"/api/v1/applications/", "/api/applications/"} {
		if strings.HasPrefix(path, prefix) {
			path = strings.TrimPrefix(path, prefix)
			break
		}
	}

	parts := strings.SplitN(strings.Trim(path, "/"), "/", 2)
	appID := parts[0]
	if appID == "" {
		writeError(w, http.StatusBadRequest, "Не указан ID заявки")
		return
	}
	subPath := ""
	if len(parts) > 1 {
		subPath = parts[1]
	}

	switch {
	case subPath == "" && r.Method == http.MethodGet:
		h.GetApplication(w, r, appID)
	case subPath == "transition" && r.Method == http.MethodPost:
		h.Transition(w, r, appID)
	case subPath == "enrich" && r.Method == http.MethodPost:
		h.Enrich(w, r, appID)
	case subPath == "scoring" && r.Method == http.MethodGet:
		h.GetScoring(w, r, appID)
	case subPath == "decision" && r.Method == http.MethodGet:
		h.GetDecision(w, r, appID)
	case subPath == "audit" && r.Method == http.MethodGet:
		h.GetAudit(w, r, appID)
	case subPath == "clarifications" && r.Method == http.MethodPost:
		h.CreateClarification(w, r, appID)
	case subPath == "documents" && r.Method == http.MethodPost:
		h.UploadDocument(w, r, appID)
	case subPath == "delegate" && r.Method == http.MethodPost:
		h.DelegateToAccountant(w, r, appID)
	case subPath == "sign" && r.Method == http.MethodPost:
		h.SignContract(w, r, appID)
	case subPath == "apply-program" && r.Method == http.MethodPost:
		h.ApplyGovProgram(w, r, appID)
	default:
		writeError(w, http.StatusNotFound, "Эндпоинт не найден: "+subPath)
	}
}

func (h *Handler) GetApplication(w http.ResponseWriter, r *http.Request, appID string) {
	app, ok := h.DB.GetApplication(appID)
	if !ok {
		writeError(w, http.StatusNotFound, "Заявка не найдена")
		return
	}
	writeJSON(w, http.StatusOK, app)
}

func (h *Handler) Transition(w http.ResponseWriter, r *http.Request, appID string) {
	var req struct {
		Trigger   string  `json:"trigger"`
		ActorType string  `json:"actor_type"`
		ActorID   *string `json:"actor_id"`
		Payload   *struct {
			SelectedOfferVariant *int    `json:"selected_offer_variant"`
			OTPCode              *string `json:"otp_code"`
		} `json:"payload"`
	}
	req.ActorType = "SYSTEM_CONVEYOR"
	if err := parseJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "Ошибка разбора JSON: "+err.Error())
		return
	}

	app, ok := h.DB.GetApplication(appID)
	if !ok {
		writeError(w, http.StatusNotFound, "Заявка не найдена")
		return
	}

	trigger := conveyor.Trigger(req.Trigger)
	if !conveyor.CanTransition(app.State, trigger) {
		allowed := conveyor.AvailableTriggers(app.State)
		var allowedStrs []string
		for _, t := range allowed {
			allowedStrs = append(allowedStrs, string(t))
		}
		writeError(w, http.StatusBadRequest,
			fmt.Sprintf("Недопустимый переход из '%s' по триггеру '%s'. Доступны: %v",
				app.State, trigger, allowedStrs))
		return
	}

	prevState := app.State
	newState, err := conveyor.Transition(app.State, trigger)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	entryID := newStoreUUID()
	details := map[string]interface{}{}
	if req.Payload != nil {
		if req.Payload.SelectedOfferVariant != nil {
			details["selected_offer_variant"] = *req.Payload.SelectedOfferVariant
			app.SelectedOfferVariant = req.Payload.SelectedOfferVariant
		}
	}

	prevStr := string(prevState)
	actorID := req.ActorID
	app.AuditLog = append(app.AuditLog, store.AuditLogEntry{
		ID: entryID, ApplicationID: appID,
		FromState:   &prevStr,
		ToState:     string(newState),
		Trigger:     req.Trigger,
		ActorType:   req.ActorType,
		ActorID:     actorID,
		DetailsJSON: details,
		CreatedAt:   nowStr(),
	})

	app.State = newState
	app.UpdatedAt = nowStr()
	h.DB.SetApplication(app)

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"application_id":      appID,
		"previous_state":      string(prevState),
		"new_state":           string(newState),
		"trigger":             req.Trigger,
		"audit_log_entry_id":  entryID,
	})
}

func (h *Handler) Enrich(w http.ResponseWriter, r *http.Request, appID string) {
	app, ok := h.DB.GetApplication(appID)
	if !ok {
		writeError(w, http.StatusNotFound, "Заявка не найдена")
		return
	}

	var bundle *conveyor.EnrichmentBundle
	for _, p := range h.DB.Presets {
		if p.Company != nil && p.Company.INN == app.Company.INN && p.Enrichment != nil {
			bundle = p.Enrichment
			break
		}
	}
	if bundle == nil {

		def := defaultEnrichment(app.Company)
		bundle = &def
	}

	app.EnrichmentSnapshots = bundle
	app.UpdatedAt = nowStr()
	h.DB.SetApplication(app)

	snapshotID := newStoreUUID()
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"application_id":       appID,
		"sources_fetched":      []string{"egrul", "fns", "bki", "alfa_accounts"},
		"enrichment_snapshot_id": snapshotID,
		"enrichment":           bundle,
	})
}

func defaultEnrichment(comp store.Company) conveyor.EnrichmentBundle {
	cap := 100_000.0
	if comp.AuthorizedCapital != nil {
		cap = *comp.AuthorizedCapital
	}
	return conveyor.EnrichmentBundle{
		Egrul: conveyor.EgrulData{
			RegistrationDate:  comp.RegistrationDate,
			AuthorizedCapital: &cap,
			OkvedMain:         comp.OkvedMain,
			IsLiquidating:     false,
			Founders:          []map[string]interface{}{},
		},
		Fns: conveyor.FnsData{TaxBlocks: []map[string]string{}, TaxDiscrepancies: 0, EmployeeCount: comp.EmployeeCount},
		Bki: conveyor.BkiData{ActiveLoans: 1, TotalMonthlyPayment: 35_000,
			Overdue0: true, Overdue30: false, Overdue60: false, Overdue90Plus: false, CreditHistoryMonths: 36},
		AlfaAccounts: conveyor.AlfaAccountsData{
			MonthlyRevenue:       []float64{1.5e6, 1.6e6, 1.7e6, 1.65e6, 1.8e6, 1.75e6, 1.9e6, 2.0e6, 1.85e6, 2.1e6, 2.2e6, 2.3e6},
			AvgBalance:           650_000,
			UniqueCounterparties: 22,
			TaxPaymentsRegular:   true,
		},
	}
}

func (h *Handler) GetScoring(w http.ResponseWriter, r *http.Request, appID string) {
	app, ok := h.DB.GetApplication(appID)
	if !ok {
		writeError(w, http.StatusNotFound, "Заявка не найдена")
		return
	}
	if app.ScoringResult != nil {
		writeJSON(w, http.StatusOK, app.ScoringResult)
		return
	}

	if app.EnrichmentSnapshots == nil {
		def := defaultEnrichment(app.Company)
		app.EnrichmentSnapshots = &def
	}
	scoring := conveyor.Score(*app.EnrichmentSnapshots)
	app.ScoringResult = &scoring
	app.UpdatedAt = nowStr()
	h.DB.SetApplication(app)
	writeJSON(w, http.StatusOK, app.ScoringResult)
}

func (h *Handler) GetDecision(w http.ResponseWriter, r *http.Request, appID string) {
	app, ok := h.DB.GetApplication(appID)
	if !ok {
		writeError(w, http.StatusNotFound, "Заявка не найдена")
		return
	}
	if app.DecisionResult != nil {
		writeJSON(w, http.StatusOK, app.DecisionResult)
		return
	}

	if app.EnrichmentSnapshots == nil {
		def := defaultEnrichment(app.Company)
		app.EnrichmentSnapshots = &def
	}
	if app.ScoringResult == nil {
		scoring := conveyor.Score(*app.EnrichmentSnapshots)
		app.ScoringResult = &scoring
	}
	appReq := conveyor.ApplicationRequest{
		CompanyINN:          app.Company.INN,
		ProductType:         conveyor.ProductType(app.ProductType),
		RequestedAmount:     app.RequestedAmount,
		RequestedTermMonths: app.RequestedTermMonths,
		GovProgramID:        app.GovProgramID,
	}
	decision := conveyor.Decide(*app.ScoringResult, appReq, *app.EnrichmentSnapshots, 0)
	app.DecisionResult = &decision
	app.Offers = decision.Offers
	if app.Offers == nil {
		app.Offers = []conveyor.CreditOffer{}
	}
	app.RehabilitationPlan = decision.RehabilitationPlan
	app.UpdatedAt = nowStr()
	h.DB.SetApplication(app)
	writeJSON(w, http.StatusOK, app.DecisionResult)
}

func (h *Handler) GetAudit(w http.ResponseWriter, r *http.Request, appID string) {
	app, ok := h.DB.GetApplication(appID)
	if !ok {
		writeError(w, http.StatusNotFound, "Заявка не найдена")
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"audit_log": app.AuditLog})
}

func (h *Handler) CreateClarification(w http.ResponseWriter, r *http.Request, appID string) {
	var req struct {
		QuestionText         string `json:"question_text"`
		RequiredDocumentType string `json:"required_document_type"`
	}
	req.RequiredDocumentType = "OTHER"
	if err := parseJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "Ошибка разбора JSON")
		return
	}

	app, ok := h.DB.GetApplication(appID)
	if !ok {
		writeError(w, http.StatusNotFound, "Заявка не найдена")
		return
	}

	clarifID := newStoreUUID()
	clarif := store.Clarification{
		ID: clarifID, ApplicationID: appID,
		QuestionText:         req.QuestionText,
		RequiredDocumentType: req.RequiredDocumentType,
		Status:               "PENDING",
		CreatedAt:            nowStr(),
		DocumentIDs:          []string{},
	}

	h.DB.SetClarification(clarif)
	app.Clarifications = append(app.Clarifications, clarif)

	if app.State == conveyor.StateManualReview || app.State == conveyor.StateValidation {
		prevStr := string(app.State)
		app.State = conveyor.StateNeedClarification
		app.AuditLog = append(app.AuditLog, store.AuditLogEntry{
			ID: newStoreUUID(), ApplicationID: appID,
			FromState: &prevStr, ToState: string(conveyor.StateNeedClarification),
			Trigger: string(conveyor.TriggerRequestClarification),
			ActorType: string(conveyor.ActorBankUnderwriter),
			DetailsJSON: map[string]interface{}{"clarification_id": clarifID, "question": req.QuestionText},
			CreatedAt: nowStr(),
		})
	}
	app.UpdatedAt = nowStr()
	h.DB.SetApplication(app)

	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"clarification_id":      clarifID,
		"status":                "PENDING",
		"application_new_state": string(app.State),
	})
}

func (h *Handler) UploadDocument(w http.ResponseWriter, r *http.Request, appID string) {
	app, ok := h.DB.GetApplication(appID)
	if !ok {
		writeError(w, http.StatusNotFound, "Заявка не найдена")
		return
	}

	if err := r.ParseMultipartForm(32 << 20); err != nil {
		writeError(w, http.StatusBadRequest, "Ошибка разбора формы: "+err.Error())
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "Файл не найден в запросе")
		return
	}
	defer file.Close()

	docType := r.FormValue("doc_type")
	if docType == "" {
		docType = "OTHER"
	}
	uploadedBy := r.FormValue("uploaded_by")
	if uploadedBy == "" {
		uploadedBy = "CLIENT_OWNER"
	}

	docID := newStoreUUID()
	safeFilename := docID + "_" + header.Filename
	filePath := filepath.Join(h.UploadDir, safeFilename)

	dst, err := os.Create(filePath)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Ошибка сохранения файла")
		return
	}
	defer dst.Close()
	size, _ := io.Copy(dst, file)

	docEntry := store.DocumentEntry{
		DocumentID: docID,
		Filename:   header.Filename,
		DocType:    docType,
		UploadedBy: uploadedBy,
		URL:        "/uploads/" + safeFilename,
		SizeBytes:  size,
		CreatedAt:  nowStr(),
	}

	h.DB.Mu.Lock()
	h.DB.Documents[docID] = docEntry
	h.DB.Mu.Unlock()

	app.Documents = append(app.Documents, docEntry)
	app.UpdatedAt = nowStr()
	h.DB.SetApplication(app)

	writeJSON(w, http.StatusCreated, docEntry)
}

func (h *Handler) DelegateToAccountant(w http.ResponseWriter, r *http.Request, appID string) {
	var req struct {
		AccountantName  string `json:"accountant_name"`
		AccountantEmail string `json:"accountant_email"`
	}
	req.AccountantName = "Главный бухгалтер"
	req.AccountantEmail = "accountant@company.ru"
	_ = parseJSON(r, &req)

	app, ok := h.DB.GetApplication(appID)
	if !ok {
		writeError(w, http.StatusNotFound, "Заявка не найдена")
		return
	}

	app.DelegatedToAccountant = true
	prevStr := string(app.State)
	app.AuditLog = append(app.AuditLog, store.AuditLogEntry{
		ID: newStoreUUID(), ApplicationID: appID,
		FromState: &prevStr, ToState: string(app.State),
		Trigger: "DELEGATE_TO_ACCOUNTANT", ActorType: string(conveyor.ActorClientOwner),
		ActorID: &app.OwnerUserID,
		DetailsJSON: map[string]interface{}{
			"accountant_name":  req.AccountantName,
			"accountant_email": req.AccountantEmail,
		},
		CreatedAt: nowStr(),
	})
	app.UpdatedAt = nowStr()
	h.DB.SetApplication(app)

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success":            true,
		"message":            "Заявка успешно делегирована бухгалтеру (" + req.AccountantName + ")",
		"accountant_user_id": app.AccountantUserID,
	})
}

func (h *Handler) SignContract(w http.ResponseWriter, r *http.Request, appID string) {
	var req struct {
		OTPCode string `json:"otp_code"`
	}
	req.OTPCode = "1234"
	_ = parseJSON(r, &req)

	if len(req.OTPCode) < 4 {
		writeError(w, http.StatusBadRequest, "Неверный OTP-код подтверждения")
		return
	}

	app, ok := h.DB.GetApplication(appID)
	if !ok {
		writeError(w, http.StatusNotFound, "Заявка не найдена")
		return
	}

	oldState := string(app.State)
	signedState := string(conveyor.StateContractSigned)
	fundedState := string(conveyor.StateFunded)
	nowISO := nowStr()

	app.State = conveyor.StateFunded

	app.AuditLog = append(app.AuditLog, store.AuditLogEntry{
		ID: newStoreUUID(), ApplicationID: appID,
		FromState: &oldState, ToState: signedState,
		Trigger: string(conveyor.TriggerSignContract), ActorType: string(conveyor.ActorClientOwner),
		ActorID: &app.OwnerUserID,
		DetailsJSON: map[string]interface{}{"otp_code_masked": "****", "signed_at": nowISO},
		CreatedAt:   nowISO,
	})

	app.AuditLog = append(app.AuditLog, store.AuditLogEntry{
		ID: newStoreUUID(), ApplicationID: appID,
		FromState: &signedState, ToState: fundedState,
		Trigger: string(conveyor.TriggerDisburse), ActorType: string(conveyor.ActorSystemConveyor),
		DetailsJSON: map[string]interface{}{"disbursed_at": nowISO, "disbursement_status": "EXECUTED"},
		CreatedAt:   nowISO,
	})

	app.UpdatedAt = nowISO
	h.DB.SetApplication(app)

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"application_id": appID,
		"state":          fundedState,
		"message":        "Кредитный договор успешно подписан ПЭП. Финансирование зачислено на расчётный счёт.",
	})
}

func (h *Handler) ApplyGovProgram(w http.ResponseWriter, r *http.Request, appID string) {
	var req struct {
		NewsItemID string `json:"news_item_id"`
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

	var program *conveyor.NewsItem
	for i, n := range conveyor.GovSupportNews {
		if n.ID == req.NewsItemID {
			program = &conveyor.GovSupportNews[i]
			break
		}
	}
	if program == nil {
		writeError(w, http.StatusNotFound, "Программа господдержки не найдена")
		return
	}

	rateAdj := 0.0
	if program.MaxRatePct != nil {
		rateAdj = -3.0
	}

	app.GovProgramID = &program.ID
	app.GovProgramTitle = &program.Title

	if app.ScoringResult != nil && app.EnrichmentSnapshots != nil {
		appReq := conveyor.ApplicationRequest{
			CompanyINN:          app.Company.INN,
			ProductType:         conveyor.ProductType(app.ProductType),
			RequestedAmount:     app.RequestedAmount,
			RequestedTermMonths: app.RequestedTermMonths,
			GovProgramID:        &program.ID,
		}
		decision := conveyor.Decide(*app.ScoringResult, appReq, *app.EnrichmentSnapshots, rateAdj)
		app.DecisionResult = &decision
		app.Offers = decision.Offers
		if app.Offers == nil {
			app.Offers = []conveyor.CreditOffer{}
		}
	}

	prevStr := string(app.State)
	app.AuditLog = append(app.AuditLog, store.AuditLogEntry{
		ID: newStoreUUID(), ApplicationID: appID,
		FromState: &prevStr, ToState: string(app.State),
		Trigger: "APPLY_GOV_PROGRAM", ActorType: string(conveyor.ActorClientOwner),
		ActorID: &app.OwnerUserID,
		DetailsJSON: map[string]interface{}{
			"program_id": program.ID, "title": program.Title, "rate_adjustment": rateAdj,
		},
		CreatedAt: nowStr(),
	})
	app.UpdatedAt = nowStr()
	h.DB.SetApplication(app)

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"application_id": appID,
		"gov_program_id": program.ID,
		"rate_adjustment": rateAdj,
		"message":        "Программа «" + program.Title + "» успешно подключена к заявке",
	})
}


