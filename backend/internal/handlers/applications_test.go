package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"alfabank-credit-conveyor/internal/conveyor"
	"alfabank-credit-conveyor/internal/store"
)

func newSigningTestServer(t *testing.T) (*store.DB, *http.ServeMux, string) {
	t.Helper()
	db := store.NewDB()
	result, err := db.LoadPreset("coffee_shop_ip")
	if err != nil {
		t.Fatalf("load preset: %v", err)
	}
	appID := result["application_id"].(string)
	app, ok := db.GetApplication(appID)
	if !ok {
		t.Fatalf("application %s not found", appID)
	}
	app.State = conveyor.StateOfferAccepted
	db.SetApplication(app)

	mux := http.NewServeMux()
	New(db, t.TempDir()).RegisterRoutes(mux)
	return db, mux, appID
}

func postJSON(t *testing.T, mux http.Handler, path, body string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)
	return rec
}

func TestTransitionCannotBypassContractOTP(t *testing.T) {
	db, mux, appID := newSigningTestServer(t)

	rec := postJSON(t, mux, "/api/applications/"+appID+"/transition", `{"trigger":"SIGN_CONTRACT"}`)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusBadRequest)
	}

	app, _ := db.GetApplication(appID)
	if app.State != conveyor.StateOfferAccepted {
		t.Fatalf("state = %s, want %s", app.State, conveyor.StateOfferAccepted)
	}
}

func TestSignContractRejectsInvalidOTPWithoutChangingState(t *testing.T) {
	db, mux, appID := newSigningTestServer(t)

	rec := postJSON(t, mux, "/api/applications/"+appID+"/sign", `{"otp_code":"0000"}`)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusBadRequest)
	}

	app, _ := db.GetApplication(appID)
	if app.State != conveyor.StateOfferAccepted {
		t.Fatalf("state = %s, want %s", app.State, conveyor.StateOfferAccepted)
	}
}

func TestSignContractWithValidOTPTransitionsToContractSigned(t *testing.T) {
	db, mux, appID := newSigningTestServer(t)

	rec := postJSON(t, mux, "/api/applications/"+appID+"/sign", `{"otp_code":"1234"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d: %s", rec.Code, http.StatusOK, rec.Body.String())
	}

	var response struct {
		State string `json:"state"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if response.State != string(conveyor.StateContractSigned) {
		t.Fatalf("response state = %s, want %s", response.State, conveyor.StateContractSigned)
	}

	app, _ := db.GetApplication(appID)
	if app.State != conveyor.StateContractSigned {
		t.Fatalf("stored state = %s, want %s", app.State, conveyor.StateContractSigned)
	}
}

func TestDisburseIsSeparateAndIdempotent(t *testing.T) {
	db, mux, appID := newSigningTestServer(t)

	if rec := postJSON(t, mux, "/api/applications/"+appID+"/sign", `{"otp_code":"1234"}`); rec.Code != http.StatusOK {
		t.Fatalf("sign status = %d: %s", rec.Code, rec.Body.String())
	}
	app, _ := db.GetApplication(appID)
	if app.State != conveyor.StateContractSigned {
		t.Fatalf("state after sign = %s, want %s", app.State, conveyor.StateContractSigned)
	}
	initialAuditCount := len(app.AuditLog)

	rec := postJSON(t, mux, "/api/applications/"+appID+"/disburse", `{}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("disburse status = %d: %s", rec.Code, rec.Body.String())
	}
	app, _ = db.GetApplication(appID)
	if app.State != conveyor.StateFunded || app.DisbursedAt == nil {
		t.Fatalf("state after disburse = %s, timestamp = %v", app.State, app.DisbursedAt)
	}
	if len(app.AuditLog) != initialAuditCount+1 {
		t.Fatalf("audit entries after disburse = %d, want %d", len(app.AuditLog), initialAuditCount+1)
	}

	rec = postJSON(t, mux, "/api/applications/"+appID+"/disburse", `{}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("repeat disburse status = %d: %s", rec.Code, rec.Body.String())
	}
	app, _ = db.GetApplication(appID)
	if len(app.AuditLog) != initialAuditCount+1 {
		t.Fatalf("repeat disburse created duplicate audit entry")
	}
}

func TestUpdateDraftPersistsCalculatorParameters(t *testing.T) {
	db := store.NewDB()
	result, err := db.LoadPreset("custom_input")
	if err != nil {
		t.Fatalf("load preset: %v", err)
	}
	appID := result["application_id"].(string)
	mux := http.NewServeMux()
	New(db, t.TempDir()).RegisterRoutes(mux)

	rec := postJSON(t, mux, "/api/applications/"+appID, `{"product_type":"OVERDRAFT","requested_amount":750000,"requested_term_months":9}`)
	if rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("POST update status = %d, want method not allowed", rec.Code)
	}
	request := httptest.NewRequest(http.MethodPatch, "/api/applications/"+appID, strings.NewReader(`{"product_type":"OVERDRAFT","requested_amount":750000,"requested_term_months":9}`))
	request.Header.Set("Content-Type", "application/json")
	patchResponse := httptest.NewRecorder()
	mux.ServeHTTP(patchResponse, request)
	if patchResponse.Code != http.StatusOK {
		t.Fatalf("PATCH status = %d: %s", patchResponse.Code, patchResponse.Body.String())
	}
	app, _ := db.GetApplication(appID)
	if app.ProductType != "OVERDRAFT" || app.RequestedAmount != 750000 || app.RequestedTermMonths != 9 {
		t.Fatalf("draft values not persisted: product=%s amount=%v term=%d", app.ProductType, app.RequestedAmount, app.RequestedTermMonths)
	}
	if len(app.AuditLog) == 0 || app.AuditLog[len(app.AuditLog)-1].Trigger != "UPDATE_DRAFT" {
		t.Fatalf("draft update was not audited")
	}
}

func TestUpdateDraftRejectsNonDraft(t *testing.T) {
	_, mux, appID := newSigningTestServer(t)

	// Application is in OFFER_ACCEPTED state
	req := httptest.NewRequest(http.MethodPatch, "/api/applications/"+appID, strings.NewReader(`{"requested_amount":500000}`))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusConflict {
		t.Fatalf("PATCH on non-draft status = %d, want %d", rec.Code, http.StatusConflict)
	}
}

func TestUpdateDraftValidatesProductType(t *testing.T) {
	db := store.NewDB()
	result, err := db.LoadPreset("custom_input")
	if err != nil {
		t.Fatalf("load preset: %v", err)
	}
	appID := result["application_id"].(string)
	mux := http.NewServeMux()
	New(db, t.TempDir()).RegisterRoutes(mux)

	req := httptest.NewRequest(http.MethodPatch, "/api/applications/"+appID, strings.NewReader(`{"product_type":"NON_EXISTENT_PRODUCT"}`))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("PATCH with invalid product status = %d, want %d", rec.Code, http.StatusBadRequest)
	}
}

func TestDisburseFailsFromInvalidState(t *testing.T) {
	_, mux, appID := newSigningTestServer(t)

	// Application is in OFFER_ACCEPTED (not CONTRACT_SIGNED)
	rec := postJSON(t, mux, "/api/applications/"+appID+"/disburse", `{}`)
	if rec.Code != http.StatusConflict {
		t.Fatalf("disburse from OFFER_ACCEPTED status = %d, want %d", rec.Code, http.StatusConflict)
	}
}

func TestFullCreditConveyorLifecycle(t *testing.T) {
	db := store.NewDB()
	result, err := db.LoadPreset("custom_input")
	if err != nil {
		t.Fatalf("load preset: %v", err)
	}
	appID := result["application_id"].(string)
	mux := http.NewServeMux()
	New(db, t.TempDir()).RegisterRoutes(mux)

	// 1. PATCH draft parameters
	patchReq := httptest.NewRequest(http.MethodPatch, "/api/applications/"+appID, strings.NewReader(`{"product_type":"WORKING_CAPITAL_LOAN","requested_amount":2000000,"requested_term_months":18}`))
	patchReq.Header.Set("Content-Type", "application/json")
	patchRec := httptest.NewRecorder()
	mux.ServeHTTP(patchRec, patchReq)
	if patchRec.Code != http.StatusOK {
		t.Fatalf("PATCH draft status = %d: %s", patchRec.Code, patchRec.Body.String())
	}

	// 2. Transition through conveyor states
	transitions := []struct {
		trigger   string
		wantState conveyor.AppState
	}{
		{"SUBMIT", conveyor.StateSubmitted},
		{"AUTO_VALIDATE", conveyor.StateValidation},
		{"VALIDATION_PASSED", conveyor.StateEnrichment},
		{"ENRICHMENT_COMPLETE", conveyor.StateScoringAndPolicy},
		{"AUTO_APPROVE", conveyor.StateApproved},
		{"ACCEPT_OFFER", conveyor.StateOfferAccepted},
	}

	for _, step := range transitions {
		rec := postJSON(t, mux, "/api/applications/"+appID+"/transition", fmt.Sprintf(`{"trigger":"%s"}`, step.trigger))
		if rec.Code != http.StatusOK {
			t.Fatalf("transition %s status = %d: %s", step.trigger, rec.Code, rec.Body.String())
		}
		app, _ := db.GetApplication(appID)
		if app.State != step.wantState {
			t.Fatalf("after trigger %s state = %s, want %s", step.trigger, app.State, step.wantState)
		}
	}

	// 3. Sign contract via OTP
	signRec := postJSON(t, mux, "/api/applications/"+appID+"/sign", `{"otp_code":"1234"}`)
	if signRec.Code != http.StatusOK {
		t.Fatalf("sign status = %d: %s", signRec.Code, signRec.Body.String())
	}
	app, _ := db.GetApplication(appID)
	if app.State != conveyor.StateContractSigned || app.SignedAt == nil {
		t.Fatalf("after sign state = %s, signed_at = %v", app.State, app.SignedAt)
	}

	// 4. Disburse funds
	disburseRec := postJSON(t, mux, "/api/applications/"+appID+"/disburse", `{}`)
	if disburseRec.Code != http.StatusOK {
		t.Fatalf("disburse status = %d: %s", disburseRec.Code, disburseRec.Body.String())
	}
	app, _ = db.GetApplication(appID)
	if app.State != conveyor.StateFunded || app.DisbursedAt == nil {
		t.Fatalf("after disburse state = %s, disbursed_at = %v", app.State, app.DisbursedAt)
	}
}
