package store

import (
	"sync"
	"time"

	"alfabank-credit-conveyor/internal/conveyor"
)

type Company struct {
	ID                string   `json:"id"`
	INN               string   `json:"inn"`
	OGRN              string   `json:"ogrn"`
	Name              string   `json:"name"`
	FullName          string   `json:"full_name"`
	LegalForm         string   `json:"legal_form"`
	OkvedMain         string   `json:"okved_main"`
	OkvedDescription  string   `json:"okved_description"`
	RegistrationDate  string   `json:"registration_date"`
	AuthorizedCapital *float64 `json:"authorized_capital"`
	Address           string   `json:"address"`
	EmployeeCount     int      `json:"employee_count"`
	IsActive          bool     `json:"is_active"`
}

type User struct {
	ID    string `json:"id"`
	Role  string `json:"role"`
	Name  string `json:"name"`
	Email string `json:"email"`
}

type AuditLogEntry struct {
	ID            string                 `json:"id"`
	ApplicationID string                 `json:"application_id"`
	FromState     *string                `json:"from_state"`
	ToState       string                 `json:"to_state"`
	Trigger       string                 `json:"trigger"`
	ActorType     string                 `json:"actor_type"`
	ActorID       *string                `json:"actor_id"`
	DetailsJSON   map[string]interface{} `json:"details_json"`
	CreatedAt     string                 `json:"created_at"`
}

type Clarification struct {
	ID                   string   `json:"id"`
	ApplicationID        string   `json:"application_id"`
	QuestionText         string   `json:"question_text"`
	RequiredDocumentType string   `json:"required_document_type"`
	Status               string   `json:"status"`
	CreatedAt            string   `json:"created_at"`
	ResponseText         *string  `json:"response_text"`
	DocumentIDs          []string `json:"document_ids"`
}

type DocumentEntry struct {
	DocumentID string `json:"document_id"`
	Filename   string `json:"filename"`
	DocType    string `json:"doc_type"`
	UploadedBy string `json:"uploaded_by"`
	URL        string `json:"url"`
	SizeBytes  int64  `json:"size_bytes"`
	CreatedAt  string `json:"created_at"`
}

type Application struct {
	ID                   string                        `json:"id"`
	CompanyID            string                        `json:"company_id"`
	Company              Company                       `json:"company"`
	OwnerUserID          string                        `json:"owner_user_id"`
	AccountantUserID     string                        `json:"accountant_user_id"`
	ProductType          string                        `json:"product_type"`
	RequestedAmount      float64                       `json:"requested_amount"`
	RequestedTermMonths  int                           `json:"requested_term_months"`
	GovProgramID         *string                       `json:"gov_program_id"`
	GovProgramTitle      *string                       `json:"gov_program_title,omitempty"`
	State                conveyor.AppState             `json:"state"`
	ScoringResult        *conveyor.ScoringResult       `json:"scoring_result"`
	DecisionResult       *conveyor.DecisionResult      `json:"decision_result"`
	Offers               []conveyor.CreditOffer        `json:"offers"`
	RehabilitationPlan   *conveyor.RehabilitationPlan  `json:"rehabilitation_plan"`
	EnrichmentSnapshots  *conveyor.EnrichmentBundle    `json:"enrichment_snapshots"`
	AuditLog             []AuditLogEntry               `json:"audit_log"`
	Clarifications       []Clarification               `json:"clarifications"`
	Documents            []DocumentEntry               `json:"documents"`
	DelegatedToAccountant bool                         `json:"delegated_to_accountant"`
	SelectedOfferVariant *int                          `json:"selected_offer_variant,omitempty"`
	CreatedAt            string                        `json:"created_at"`
	UpdatedAt            string                        `json:"updated_at"`
}

type DB struct {
	Mu             sync.RWMutex
	Presets        map[string]conveyor.SyntheticPreset
	Companies      map[string]Company
	Users          map[string]User
	Applications   map[string]Application
	Clarifications map[string]Clarification
	Documents      map[string]DocumentEntry
	ActivePresetID string
}

func NewDB() *DB {
	db := &DB{
		Presets:        make(map[string]conveyor.SyntheticPreset),
		Companies:      make(map[string]Company),
		Users:          make(map[string]User),
		Applications:   make(map[string]Application),
		Clarifications: make(map[string]Clarification),
		Documents:      make(map[string]DocumentEntry),
		ActivePresetID: "coffee_shop_ip",
	}
	for _, p := range conveyor.BuildPresets() {
		db.Presets[p.PresetID] = p
	}
	return db
}

func (db *DB) Clear() {
	db.Mu.Lock()
	defer db.Mu.Unlock()
	db.Companies = make(map[string]Company)
	db.Users = make(map[string]User)
	db.Applications = make(map[string]Application)
	db.Clarifications = make(map[string]Clarification)
	db.Documents = make(map[string]DocumentEntry)
}

func now() string {
	return time.Now().UTC().Format(time.RFC3339)
}

func strPtr(s string) *string { return &s }

func (db *DB) LoadPreset(presetID string) (map[string]interface{}, error) {
	preset, ok := db.Presets[presetID]
	if !ok {
		return nil, ErrNotFound("пресет", presetID)
	}

	db.Clear()
	db.Mu.Lock()
	defer db.Mu.Unlock()
	db.ActivePresetID = presetID

	ownerID := newUUID()
	accountantID := newUUID()

	db.Users[ownerID] = User{ID: ownerID, Role: "OWNER", Name: "Алексей Смирнов (Собственник)", Email: "owner@company.ru"}
	db.Users[accountantID] = User{ID: accountantID, Role: "ACCOUNTANT", Name: "Елена Кузнецова (Главбух)", Email: "accountant@company.ru"}

	if preset.Company == nil || preset.Application == nil {
		compID := newUUID()
		appID := newUUID()
		comp := Company{
			ID: compID, INN: "", OGRN: "", Name: "Новая компания (ручной ввод)",
			FullName: "Новая компания (ручной ввод)", LegalForm: "OOO",
			OkvedMain: "46.90", OkvedDescription: "Торговля оптовая неспециализированная",
			RegistrationDate: time.Now().Format("2006-01-02"), AuthorizedCapital: func() *float64 { v := 10_000.0; return &v }(),
			Address: "г. Москва", EmployeeCount: 1, IsActive: true,
		}
		db.Companies[compID] = comp

		app := Application{
			ID: appID, CompanyID: compID, Company: comp,
			OwnerUserID: ownerID, AccountantUserID: accountantID,
			ProductType: "WORKING_CAPITAL_LOAN", RequestedAmount: 1_000_000, RequestedTermMonths: 12,
			State: conveyor.StateDraft, Offers: []conveyor.CreditOffer{},
			AuditLog: []AuditLogEntry{{
				ID: newUUID(), ApplicationID: appID, FromState: nil,
				ToState:     string(conveyor.StateDraft),
				Trigger:     "INIT_PRESET", ActorType: string(conveyor.ActorSystemConveyor),
				DetailsJSON: map[string]interface{}{"preset_id": presetID},
				CreatedAt:   now(),
			}},
			Clarifications: []Clarification{}, Documents: []DocumentEntry{},
			CreatedAt: now(), UpdatedAt: now(),
		}
		db.Applications[appID] = app

		return map[string]interface{}{
			"preset_id": presetID, "company_id": compID,
			"owner_user_id": ownerID, "accountant_user_id": accountantID,
			"application_id": appID, "current_state": string(conveyor.StateDraft),
		}, nil
	}

	compID := newUUID()
	comp := Company{
		ID: compID, INN: preset.Company.INN, OGRN: preset.Company.OGRN,
		Name: preset.Company.Name, FullName: preset.Company.FullName,
		LegalForm: preset.Company.LegalForm, OkvedMain: preset.Company.OkvedMain,
		OkvedDescription: preset.Company.OkvedDescription,
		RegistrationDate: preset.Company.RegistrationDate,
		AuthorizedCapital: preset.Company.AuthorizedCapital,
		Address: preset.Company.Address, EmployeeCount: preset.Company.EmployeeCount,
		IsActive: preset.Company.IsActive,
	}
	db.Companies[compID] = comp

	appID := newUUID()
	finalState, scoring, decision := conveyor.RunConveyor(*preset.Application, *preset.Enrichment)

	auditLog := make([]AuditLogEntry, 0)
	states := buildAuditTrail(appID, finalState)
	auditLog = append(auditLog, states...)

	offers := make([]conveyor.CreditOffer, 0)
	var rehab *conveyor.RehabilitationPlan
	var decResult *conveyor.DecisionResult
	var scoreResult *conveyor.ScoringResult

	if decision != nil {
		decResult = decision
		offers = decision.Offers
		if offers == nil {
			offers = []conveyor.CreditOffer{}
		}
		rehab = decision.RehabilitationPlan
	}
	if scoring != nil {
		scoreResult = scoring
	}

	app := Application{
		ID: appID, CompanyID: compID, Company: comp,
		OwnerUserID: ownerID, AccountantUserID: accountantID,
		ProductType:         string(preset.Application.ProductType),
		RequestedAmount:     preset.Application.RequestedAmount,
		RequestedTermMonths: preset.Application.RequestedTermMonths,
		State:               finalState,
		ScoringResult:       scoreResult,
		DecisionResult:      decResult,
		Offers:              offers,
		RehabilitationPlan:  rehab,
		EnrichmentSnapshots: preset.Enrichment,
		AuditLog:            auditLog,
		Clarifications:      []Clarification{},
		Documents:           []DocumentEntry{},
		CreatedAt:           now(), UpdatedAt: now(),
	}

	if presetID == "logistics_seasonal" {
		clarifID := newUUID()
		clarif := Clarification{
			ID: clarifID, ApplicationID: appID,
			QuestionText:         "Поясните снижение выручки в весенний период и приложите ОСВ за последние 6 месяцев.",
			RequiredDocumentType: "OSV", Status: "PENDING",
			CreatedAt: now(), DocumentIDs: []string{},
		}
		db.Clarifications[clarifID] = clarif
		app.Clarifications = append(app.Clarifications, clarif)
	}

	db.Applications[appID] = app

	return map[string]interface{}{
		"preset_id": presetID, "company_id": compID,
		"owner_user_id": ownerID, "accountant_user_id": accountantID,
		"application_id": appID, "current_state": string(finalState),
	}, nil
}

func buildAuditTrail(appID string, finalState conveyor.AppState) []AuditLogEntry {
	type step struct{ from, to string; trigger, actor string }
	chain := []step{
		{from: "", to: "DRAFT", trigger: "INIT_PRESET", actor: "SYSTEM_CONVEYOR"},
		{from: "DRAFT", to: "SUBMITTED", trigger: "SUBMIT", actor: "CLIENT_OWNER"},
		{from: "SUBMITTED", to: "VALIDATION", trigger: "AUTO_VALIDATE", actor: "SYSTEM_CONVEYOR"},
		{from: "VALIDATION", to: "ENRICHMENT", trigger: "VALIDATION_PASSED", actor: "SYSTEM_CONVEYOR"},
		{from: "ENRICHMENT", to: "SCORING_AND_POLICY", trigger: "ENRICHMENT_COMPLETE", actor: "SYSTEM_CONVEYOR"},
	}

	switch finalState {
	case conveyor.StateApproved:
		chain = append(chain, step{"SCORING_AND_POLICY", "APPROVED", "AUTO_APPROVE", "SYSTEM_CONVEYOR"})
	case conveyor.StateCounterOffer:
		chain = append(chain, step{"SCORING_AND_POLICY", "COUNTER_OFFER", "COUNTER_OFFER_GENERATED", "SYSTEM_CONVEYOR"})
	case conveyor.StateManualReview:
		chain = append(chain, step{"SCORING_AND_POLICY", "MANUAL_REVIEW", "NEEDS_MANUAL_REVIEW", "SYSTEM_CONVEYOR"})
	case conveyor.StateRejected:
		chain = append(chain, step{"SCORING_AND_POLICY", "REJECTED", "AUTO_REJECT", "SYSTEM_CONVEYOR"})
	}

	entries := make([]AuditLogEntry, 0)
	for _, s := range chain {
		var fromState *string
		if s.from != "" {
			fromState = strPtr(s.from)
		}
		entries = append(entries, AuditLogEntry{
			ID: newUUID(), ApplicationID: appID,
			FromState: fromState, ToState: s.to,
			Trigger: s.trigger, ActorType: s.actor,
			DetailsJSON: map[string]interface{}{},
			CreatedAt:   now(),
		})
	}
	return entries
}

func (db *DB) GetApplication(id string) (Application, bool) {
	db.Mu.RLock()
	defer db.Mu.RUnlock()
	app, ok := db.Applications[id]
	return app, ok
}

func (db *DB) SetApplication(app Application) {
	db.Mu.Lock()
	defer db.Mu.Unlock()
	db.Applications[app.ID] = app
}

func (db *DB) GetClarification(id string) (Clarification, bool) {
	db.Mu.RLock()
	defer db.Mu.RUnlock()
	c, ok := db.Clarifications[id]
	return c, ok
}

func (db *DB) SetClarification(c Clarification) {
	db.Mu.Lock()
	defer db.Mu.Unlock()
	db.Clarifications[c.ID] = c
}

func (db *DB) ListApplications() []Application {
	db.Mu.RLock()
	defer db.Mu.RUnlock()
	var list []Application
	for _, a := range db.Applications {
		list = append(list, a)
	}
	return list
}

type StoreErr struct{ Msg string }
func (e StoreErr) Error() string { return e.Msg }
func ErrNotFound(entity, id string) StoreErr {
	return StoreErr{Msg: entity + " '" + id + "' не найден"}
}


