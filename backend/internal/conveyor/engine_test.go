package conveyor

import (
	"testing"
)

func TestScoreAndDecidePreset1(t *testing.T) {
	presets := BuildPresets()
	p1 := presets[0]

	res := Score(*p1.Enrichment)
	if res.RiskGrade != GradeA {
		t.Errorf("expected GradeA, got %s", res.RiskGrade)
	}
	if len(res.StopFactors) != 0 {
		t.Errorf("expected no stop factors, got %v", res.StopFactors)
	}

	dec := Decide(res, *p1.Application, *p1.Enrichment, 0)
	if dec.Decision != DecisionApproved {
		t.Errorf("expected DecisionApproved, got %s", dec.Decision)
	}
	if len(dec.Offers) != 1 {
		t.Fatalf("expected 1 offer, got %d", len(dec.Offers))
	}
	if dec.Offers[0].ApprovedAmount != 500_000 {
		t.Errorf("expected approved amount 500000, got %f", dec.Offers[0].ApprovedAmount)
	}
}

func TestScoreAndDecidePreset2(t *testing.T) {
	presets := BuildPresets()
	p2 := presets[1]

	res := Score(*p2.Enrichment)
	if res.RiskGrade != GradeA && res.RiskGrade != GradeB {
		t.Errorf("expected GradeA or GradeB, got %s", res.RiskGrade)
	}

	dec := Decide(res, *p2.Application, *p2.Enrichment, 0)
	if dec.Decision != DecisionCounterOffer {
		t.Errorf("expected DecisionCounterOffer, got %s", dec.Decision)
	}
	if len(dec.Offers) != 3 {
		t.Fatalf("expected 3 counter offers, got %d", len(dec.Offers))
	}
}

func TestScoreAndDecidePreset3(t *testing.T) {
	presets := BuildPresets()
	p3 := presets[2]

	res := Score(*p3.Enrichment)
	if res.RiskGrade != GradeC {
		t.Errorf("expected GradeC, got %s", res.RiskGrade)
	}

	dec := Decide(res, *p3.Application, *p3.Enrichment, 0)
	if dec.Decision != DecisionManualReview {
		t.Errorf("expected DecisionManualReview, got %s", dec.Decision)
	}
	if len(dec.SoftFlags) == 0 {
		t.Errorf("expected soft flags for preset 3, got none")
	}
}

func TestScoreAndDecidePreset4(t *testing.T) {
	presets := BuildPresets()
	p4 := presets[3]

	res := Score(*p4.Enrichment)
	if res.RiskGrade != GradeE {
		t.Errorf("expected GradeE, got %s", res.RiskGrade)
	}
	if len(res.StopFactors) == 0 {
		t.Errorf("expected stop factors for preset 4, got none")
	}

	dec := Decide(res, *p4.Application, *p4.Enrichment, 0)
	if dec.Decision != DecisionRejected {
		t.Errorf("expected DecisionRejected, got %s", dec.Decision)
	}
	if dec.RehabilitationPlan == nil {
		t.Fatalf("expected rehabilitation plan for rejected application, got nil")
	}
	if len(dec.RehabilitationPlan.ActionItems) == 0 {
		t.Errorf("expected action items in rehab plan, got none")
	}
}

func TestFSMTransitions(t *testing.T) {
	if !CanTransition(StateDraft, TriggerSubmit) {
		t.Errorf("expected CanTransition(StateDraft, TriggerSubmit) to be true")
	}
	if CanTransition(StateDraft, TriggerDisburse) {
		t.Errorf("expected CanTransition(StateDraft, TriggerDisburse) to be false")
	}

	next, err := Transition(StateDraft, TriggerSubmit)
	if err != nil || next != StateSubmitted {
		t.Errorf("expected transition to StateSubmitted, got %s, err: %v", next, err)
	}
}

