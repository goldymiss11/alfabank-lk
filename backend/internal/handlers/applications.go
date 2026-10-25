package handlers

import (
	"fmt"
	"io"
	"math"
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
	case subPath == "" && r.Method == http.MethodPatch:
		h.UpdateApplication(w, r, appID)
	case subPath == "":
		writeError(w, http.StatusMethodNotAllowed, "Метод не поддерживается")
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
	case subPath == "disburse" && r.Method == http.MethodPost:
		h.Disburse(w, r, appID)
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

func (h *Handler) UpdateApplication(w http.ResponseWriter, r *http.Request, appID string) {
	var req struct {
		ProductType         *string  `json:"product_type"`
		RequestedAmount     *float64 `json:"requested_amount"`
		RequestedTermMonths *int     `json:"requested_term_months"`
		GovProgramID        *string  `json:"gov_program_id"`
	}
	if err := parseJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "Ошибка разбора JSON: "+err.Error())
		return
	}

	app, ok := h.DB.GetApplication(appID)
	if !ok {
		writeError(w, http.StatusNotFound, "Заявка не найдена")
		return
	}
	if app.State != conveyor.StateDraft {
		writeError(w, http.StatusConflict, "Изменять параметры можно только в статусе «Черновик»")
		return
	}
	if req.ProductType == nil && req.RequestedAmount == nil && req.RequestedTermMonths == nil && req.GovProgramID == nil {
		writeError(w, http.StatusBadRequest, "Не передан ни один параметр для обновления")
		return
	}

	if req.ProductType != nil {
		product := conveyor.ProductType(*req.ProductType)
		if _, exists := conveyor.ProductCatalog[product]; !exists {
			writeError(w, http.StatusBadRequest, "Неизвестный кредитный продукт")
			return
		}
		app.ProductType = string(product)
	}
	if req.RequestedAmount != nil {
		if math.IsNaN(*req.RequestedAmount) || math.IsInf(*req.RequestedAmount, 0) || *req.RequestedAmount <= 0 {
			writeError(w, http.StatusBadRequest, "Сумма должна быть положительным числом")
			return
		}
		app.RequestedAmount = *req.RequestedAmount
	}
	if req.RequestedTermMonths != nil {
		if *req.RequestedTermMonths < 1 || *req.RequestedTermMonths > 120 {
			writeError(w, http.StatusBadRequest, "Срок должен быть от 1 до 120 месяцев")
			return
		}
		app.RequestedTermMonths = *req.RequestedTermMonths
	}
	if req.GovProgramID != nil {
		if *req.GovProgramID == "" {
			app.GovProgramID = nil
		} else {
			programID := *req.GovProgramID
			app.GovProgramID = &programID
		}
	}

	app.ScoringResult = nil
	app.DecisionResult = nil
	app.Offers = []conveyor.CreditOffer{}
	app.RehabilitationPlan = nil
	details := map[string]interface{}{
		"product_type":          app.ProductType,
		"requested_amount":      app.RequestedAmount,
		"requested_term_months": app.RequestedTermMonths,
	}
	previousState := string(app.State)
	app.AuditLog = append(app.AuditLog, store.AuditLogEntry{
		ID: newStoreUUID(), ApplicationID: appID, FromState: &previousState,
		ToState: string(app.State), Trigger: "UPDATE_DRAFT", ActorType: string(conveyor.ActorClientOwner),
		ActorID: &app.OwnerUserID, DetailsJSON: details, CreatedAt: nowStr(),
	})
	app.UpdatedAt = nowStr()
	h.DB.SetApplication(app)
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
	if trigger == conveyor.TriggerSignContract {
		writeError(w, http.StatusBadRequest, "Для подписания договора используйте endpoint /sign с OTP-кодом")
		return
	}
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
		"application_id":     appID,
		"previous_state":     string(prevState),
		"new_state":          string(newState),
		"trigger":            req.Trigger,
		"audit_log_entry_id": entryID,
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
		"application_id":         appID,
		"sources_fetched":        []string{"egrul", "fns", "bki", "alfa_accounts"},
		"enrichment_snapshot_id": snapshotID,
		"enrichment":             bundle,
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
			Trigger:     string(conveyor.TriggerRequestClarification),
			ActorType:   string(conveyor.ActorBankUnderwriter),
			DetailsJSON: map[string]interface{}{"clarification_id": clarifID, "question": req.QuestionText},
			CreatedAt:   nowStr(),
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

	const maxUploadSize = 25 << 20
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize)
	if err := r.ParseMultipartForm(2 << 20); err != nil {
		if strings.Contains(err.Error(), "request body too large") {
			writeError(w, http.StatusRequestEntityTooLarge, "Файл превышает ограничение 25 МБ")
		} else {
			writeError(w, http.StatusBadRequest, "Ошибка разбора формы: "+err.Error())
		}
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
	ext := strings.ToLower(filepath.Ext(header.Filename))
	allowedExtensions := map[string]bool{".pdf": true, ".png": true, ".jpg": true, ".jpeg": true, ".xlsx": true, ".xls": true}
	if !allowedExtensions[ext] {
		writeError(w, http.StatusBadRequest, "Поддерживаются только PDF, PNG, JPG и XLSX")
		return
	}
	if header.Size > maxUploadSize {
		writeError(w, http.StatusRequestEntityTooLarge, "Файл превышает ограничение 25 МБ")
		return
	}
	uploadedBy := r.FormValue("uploaded_by")
	if uploadedBy == "" {
		uploadedBy = "CLIENT_OWNER"
	}

	docID := newStoreUUID()
	safeFilename := docID + ext
	filePath := filepath.Join(h.UploadDir, safeFilename)

	dst, err := os.Create(filePath)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Ошибка сохранения файла")
		return
	}
	defer dst.Close()
	size, err := io.Copy(dst, http.MaxBytesReader(w, file, maxUploadSize))
	if err != nil {
		_ = os.Remove(filePath)
		writeError(w, http.StatusRequestEntityTooLarge, "Файл превышает ограничение 25 МБ")
		return
	}

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
	if err := parseJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "Ошибка разбора JSON: "+err.Error())
		return
	}
	if req.OTPCode != "1234" {
		writeError(w, http.StatusBadRequest, "Неверный OTP-код подтверждения")
		return
	}

	app, ok := h.DB.GetApplication(appID)
	if !ok {
		writeError(w, http.StatusNotFound, "Заявка не найдена")
		return
	}
	if !conveyor.CanTransition(app.State, conveyor.TriggerSignContract) {
		writeError(w, http.StatusConflict, fmt.Sprintf("Подписание недоступно из текущего состояния '%s'", app.State))
		return
	}

	oldState := app.State
	newState, err := conveyor.Transition(oldState, conveyor.TriggerSignContract)
	if err != nil {
		writeError(w, http.StatusConflict, err.Error())
		return
	}
	nowISO := nowStr()
	oldStateStr := string(oldState)
	app.State = newState
	signedAt := nowISO
	app.SignedAt = &signedAt
	app.AuditLog = append(app.AuditLog, store.AuditLogEntry{
		ID: newStoreUUID(), ApplicationID: appID,
		FromState: &oldStateStr, ToState: string(newState),
		Trigger: string(conveyor.TriggerSignContract), ActorType: string(conveyor.ActorClientOwner),
		ActorID:     &app.OwnerUserID,
		DetailsJSON: map[string]interface{}{"otp_code_masked": "****", "signed_at": nowISO},
		CreatedAt:   nowISO,
	})
	app.UpdatedAt = nowISO
	h.DB.SetApplication(app)

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"application_id": appID,
		"state":          string(newState),
		"message":        "Кредитный договор успешно подписан ПЭП. Ожидается зачисление финансирования.",
	})
}

func (h *Handler) Disburse(w http.ResponseWriter, r *http.Request, appID string) {
	app, ok := h.DB.GetApplication(appID)
	if !ok {
		writeError(w, http.StatusNotFound, "Заявка не найдена")
		return
	}
	if app.State == conveyor.StateFunded {
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"application_id": appID,
			"state":          string(conveyor.StateFunded),
			"idempotent":     true,
			"message":        "Финансирование уже было зачислено",
		})
		return
	}
	if !conveyor.CanTransition(app.State, conveyor.TriggerDisburse) {
		writeError(w, http.StatusConflict, fmt.Sprintf("Выдача финансирования недоступна из текущего состояния '%s'", app.State))
		return
	}

	previousState := app.State
	newState, err := conveyor.Transition(previousState, conveyor.TriggerDisburse)
	if err != nil {
		writeError(w, http.StatusConflict, err.Error())
		return
	}
	disbursedAt := nowStr()
	previousStateString := string(previousState)
	app.State = newState
	app.DisbursedAt = &disbursedAt
	app.AuditLog = append(app.AuditLog, store.AuditLogEntry{
		ID: newStoreUUID(), ApplicationID: appID,
		FromState: &previousStateString, ToState: string(newState),
		Trigger: string(conveyor.TriggerDisburse), ActorType: string(conveyor.ActorSystemConveyor),
		DetailsJSON: map[string]interface{}{"disbursed_at": disbursedAt, "disbursement_status": "EXECUTED"},
		CreatedAt:   disbursedAt,
	})
	app.UpdatedAt = disbursedAt
	h.DB.SetApplication(app)

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"application_id": appID,
		"state":          string(newState),
		"idempotent":     false,
		"message":        "Финансирование зачислено на расчётный счёт",
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
		"application_id":  appID,
		"gov_program_id":  program.ID,
		"rate_adjustment": rateAdj,
		"message":         "Программа «" + program.Title + "» успешно подключена к заявке",
	})
}
