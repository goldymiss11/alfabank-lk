package conveyor

import "fmt"

// FSM transitions: from -> trigger -> to
var transitions = map[AppState]map[Trigger]AppState{
	StateDraft: {
		TriggerSubmit:  StateSubmitted,
		TriggerCancel:  StateCancelled,
	},
	StateSubmitted: {
		TriggerAutoValidate: StateValidation,
		TriggerCancel:       StateCancelled,
	},
	StateValidation: {
		TriggerValidationPassed: StateEnrichment,
		TriggerValidationFailed: StateRejected,
	},
	StateEnrichment: {
		TriggerEnrichmentComplete: StateScoringAndPolicy,
	},
	StateScoringAndPolicy: {
		TriggerAutoApprove:          StateApproved,
		TriggerCounterOfferGenerated: StateCounterOffer,
		TriggerNeedsManualReview:    StateManualReview,
		TriggerAutoReject:           StateRejected,
	},
	StateApproved: {
		TriggerAcceptOffer: StateOfferAccepted,
	},
	StateCounterOffer: {
		TriggerAcceptOffer:  StateOfferAccepted,
		TriggerCancel:       StateCancelled,
		TriggerOffersExpired: StateRejected,
	},
	StateManualReview: {
		TriggerUnderwriterApprove:      StateApproved,
		TriggerUnderwriterReject:       StateRejected,
		TriggerRequestClarification:    StateNeedClarification,
		TriggerUnderwriterCounterOffer: StateCounterOffer,
	},
	StateNeedClarification: {
		TriggerClientResponded: StateResubmitted,
		TriggerCancel:          StateCancelled,
	},
	StateResubmitted: {
		TriggerReScore: StateScoringAndPolicy,
	},
	StateOfferAccepted: {
		TriggerSignContract: StateContractSigned,
	},
	StateContractSigned: {
		TriggerDisburse: StateFunded,
	},
}

// CanTransition checks if transition is valid
func CanTransition(from AppState, trigger Trigger) bool {
	ts, ok := transitions[from]
	if !ok {
		return false
	}
	_, ok = ts[trigger]
	return ok
}

// Transition performs the state change
func Transition(from AppState, trigger Trigger) (AppState, error) {
	ts, ok := transitions[from]
	if !ok {
		return from, fmt.Errorf("нет переходов из состояния '%s'", from)
	}
	to, ok := ts[trigger]
	if !ok {
		return from, fmt.Errorf("недопустимый триггер '%s' из состояния '%s'", trigger, from)
	}
	return to, nil
}

// AvailableTriggers returns list of allowed triggers from current state
func AvailableTriggers(from AppState) []Trigger {
	ts, ok := transitions[from]
	if !ok {
		return nil
	}
	var result []Trigger
	for t := range ts {
		result = append(result, t)
	}
	return result
}

// RunConveyor автоматически прогоняет заявку через конвейер из DRAFT до финального состояния
func RunConveyor(req ApplicationRequest, enrichment EnrichmentBundle) (AppState, *ScoringResult, *DecisionResult) {
	// DRAFT → SUBMITTED → VALIDATION → ENRICHMENT → SCORING_AND_POLICY → final
	state := StateDraft

	// SUBMIT
	state, _ = Transition(state, TriggerSubmit)
	// AUTO_VALIDATE
	state, _ = Transition(state, TriggerAutoValidate)
	// VALIDATION_PASSED (ИНН валиден, сумма > 0)
	if req.CompanyINN != "" && req.RequestedAmount > 0 {
		state, _ = Transition(state, TriggerValidationPassed)
	} else {
		state, _ = Transition(state, TriggerValidationFailed)
		return state, nil, nil
	}
	// ENRICHMENT_COMPLETE
	state, _ = Transition(state, TriggerEnrichmentComplete)

	// SCORING
	scoring := Score(enrichment)
	decision := Decide(scoring, req, enrichment, 0)

	// Выбор триггера по результату
	switch decision.Decision {
	case DecisionApproved:
		state, _ = Transition(state, TriggerAutoApprove)
	case DecisionCounterOffer:
		state, _ = Transition(state, TriggerCounterOfferGenerated)
	case DecisionManualReview:
		state, _ = Transition(state, TriggerNeedsManualReview)
	case DecisionRejected:
		state, _ = Transition(state, TriggerAutoReject)
	}

	return state, &scoring, &decision
}
