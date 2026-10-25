package conveyor

import (
	"fmt"
	"math"
	"strings"
	"time"
)

type AppState string

const (
	StateDraft             AppState = "DRAFT"
	StateSubmitted         AppState = "SUBMITTED"
	StateValidation        AppState = "VALIDATION"
	StateEnrichment        AppState = "ENRICHMENT"
	StateScoringAndPolicy  AppState = "SCORING_AND_POLICY"
	StateApproved          AppState = "APPROVED"
	StateCounterOffer      AppState = "COUNTER_OFFER"
	StateManualReview      AppState = "MANUAL_REVIEW"
	StateNeedClarification AppState = "NEED_CLARIFICATION"
	StateResubmitted       AppState = "RESUBMITTED"
	StateRejected          AppState = "REJECTED"
	StateOfferAccepted     AppState = "OFFER_ACCEPTED"
	StateContractSigned    AppState = "CONTRACT_SIGNED"
	StateFunded            AppState = "FUNDED"
	StateCancelled         AppState = "CANCELLED"
)

type Trigger string

const (
	TriggerSubmit                  Trigger = "SUBMIT"
	TriggerAutoValidate            Trigger = "AUTO_VALIDATE"
	TriggerValidationPassed        Trigger = "VALIDATION_PASSED"
	TriggerValidationFailed        Trigger = "VALIDATION_FAILED"
	TriggerEnrichmentComplete      Trigger = "ENRICHMENT_COMPLETE"
	TriggerAutoApprove             Trigger = "AUTO_APPROVE"
	TriggerCounterOfferGenerated   Trigger = "COUNTER_OFFER_GENERATED"
	TriggerNeedsManualReview       Trigger = "NEEDS_MANUAL_REVIEW"
	TriggerAutoReject              Trigger = "AUTO_REJECT"
	TriggerUnderwriterApprove      Trigger = "UNDERWRITER_APPROVE"
	TriggerUnderwriterReject       Trigger = "UNDERWRITER_REJECT"
	TriggerRequestClarification    Trigger = "REQUEST_CLARIFICATION"
	TriggerUnderwriterCounterOffer Trigger = "UNDERWRITER_COUNTER_OFFER"
	TriggerClientResponded         Trigger = "CLIENT_RESPONDED"
	TriggerReScore                 Trigger = "RE_SCORE"
	TriggerAcceptOffer             Trigger = "ACCEPT_OFFER"
	TriggerSignContract            Trigger = "SIGN_CONTRACT"
	TriggerDisburse                Trigger = "DISBURSE"
	TriggerCancel                  Trigger = "CANCEL"
	TriggerOffersExpired           Trigger = "OFFERS_EXPIRED"
)

type ActorType string

const (
	ActorClientOwner      ActorType = "CLIENT_OWNER"
	ActorClientAccountant ActorType = "CLIENT_ACCOUNTANT"
	ActorSystemConveyor   ActorType = "SYSTEM_CONVEYOR"
	ActorBankUnderwriter  ActorType = "BANK_UNDERWRITER"
)

type ProductType string

const (
	ProductOverdraft          ProductType = "OVERDRAFT"
	ProductWorkingCapitalLoan ProductType = "WORKING_CAPITAL_LOAN"
	ProductRevolvingLineVKL   ProductType = "REVOLVING_LINE_VKL"
	ProductInvestmentLoan     ProductType = "INVESTMENT_LOAN"
)

type RiskGrade string

const (
	GradeA RiskGrade = "A"
	GradeB RiskGrade = "B"
	GradeC RiskGrade = "C"
	GradeD RiskGrade = "D"
	GradeE RiskGrade = "E"
)

type Decision string

const (
	DecisionApproved     Decision = "APPROVED"
	DecisionCounterOffer Decision = "COUNTER_OFFER"
	DecisionManualReview Decision = "MANUAL_REVIEW"
	DecisionRejected     Decision = "REJECTED"
)

type EgrulData struct {
	RegistrationDate  string                   `json:"registration_date"`
	AuthorizedCapital *float64                 `json:"authorized_capital"`
	OkvedMain         string                   `json:"okved_main"`
	IsLiquidating     bool                     `json:"is_liquidating"`
	Founders          []map[string]interface{} `json:"founders"`
}

type FnsData struct {
	TaxBlocks        []map[string]string `json:"tax_blocks"`
	TaxDiscrepancies int                 `json:"tax_discrepancies"`
	EmployeeCount    int                 `json:"employee_count"`
}

type BkiData struct {
	ActiveLoans         int     `json:"active_loans"`
	TotalMonthlyPayment float64 `json:"total_monthly_payment"`
	Overdue0            bool    `json:"overdue_0"`
	Overdue30           bool    `json:"overdue_30"`
	Overdue60           bool    `json:"overdue_60"`
	Overdue90Plus       bool    `json:"overdue_90_plus"`
	CreditHistoryMonths int     `json:"credit_history_months"`
}

type AlfaAccountsData struct {
	MonthlyRevenue       []float64 `json:"monthly_revenue"`
	AvgBalance           float64   `json:"avg_balance"`
	UniqueCounterparties int       `json:"unique_counterparties"`
	TaxPaymentsRegular   bool      `json:"tax_payments_regular"`
}

type EnrichmentBundle struct {
	Egrul        EgrulData        `json:"egrul"`
	Fns          FnsData          `json:"fns"`
	Bki          BkiData          `json:"bki"`
	AlfaAccounts AlfaAccountsData `json:"alfa_accounts"`
}

type ScoringFactor struct {
	FactorName  string      `json:"factor_name"`
	Group       string      `json:"group"`
	RawValue    interface{} `json:"raw_value"`
	ScoreDelta  int         `json:"score_delta"`
	MaxWeight   int         `json:"max_weight"`
	Description string      `json:"description"`
}

type ScoringResult struct {
	RiskScore        int             `json:"risk_score"`
	PD               float64         `json:"pd"`
	RiskGrade        RiskGrade       `json:"risk_grade"`
	StopFactors      []string        `json:"stop_factors"`
	FactorsBreakdown []ScoringFactor `json:"factors_breakdown"`
}

type CreditOffer struct {
	VariantIndex          int         `json:"variant_index"`
	ProductType           ProductType `json:"product_type"`
	ApprovedAmount        float64     `json:"approved_amount"`
	TermMonths            int         `json:"term_months"`
	AnnualRatePct         float64     `json:"annual_rate_pct"`
	MonthlyPayment        float64     `json:"monthly_payment"`
	CollateralRequired    bool        `json:"collateral_required"`
	CollateralDescription *string     `json:"collateral_description"`
	Description           string      `json:"description"`
}

type ActionItem struct {
	Action       string `json:"action"`
	DeadlineDays int    `json:"deadline_days"`
	Priority     string `json:"priority"`
}

type RehabilitationPlan struct {
	DurationDays        int          `json:"duration_days"`
	RejectionReasons    []string     `json:"rejection_reasons"`
	ActionItems         []ActionItem `json:"action_items"`
	EstimatedGradeAfter string       `json:"estimated_grade_after"`
	ReapplyEligibleDate string       `json:"reapply_eligible_date"`
}

type DecisionResult struct {
	Decision           Decision            `json:"decision"`
	MaxMonthlyPayment  float64             `json:"max_monthly_payment"`
	MaxUnsecuredLimit  float64             `json:"max_unsecured_limit"`
	MaxSecuredLimit    float64             `json:"max_secured_limit"`
	DtiRatio           float64             `json:"dti_ratio"`
	Offers             []CreditOffer       `json:"offers"`
	RehabilitationPlan *RehabilitationPlan `json:"rehabilitation_plan"`
	SoftFlags          []string            `json:"soft_flags"`
}

type ApplicationRequest struct {
	CompanyINN          string      `json:"company_inn"`
	ProductType         ProductType `json:"product_type"`
	RequestedAmount     float64     `json:"requested_amount"`
	RequestedTermMonths int         `json:"requested_term_months"`
	GovProgramID        *string     `json:"gov_program_id"`
}

type ProductConfig struct {
	Code                ProductType
	MinAmount           float64
	MaxAmount           float64
	MinTerm             int
	MaxTerm             int
	Rates               map[RiskGrade]float64
	CollateralThreshold *float64
}

var collateral5M = 5_000_000.0
var collateral3M = 3_000_000.0

var ProductCatalog = map[ProductType]ProductConfig{
	ProductOverdraft: {
		Code: ProductOverdraft, MinAmount: 50_000, MaxAmount: 3_000_000,
		MinTerm: 3, MaxTerm: 12,
		Rates:               map[RiskGrade]float64{GradeA: 18.0, GradeB: 21.0, GradeC: 25.0},
		CollateralThreshold: nil,
	},
	ProductWorkingCapitalLoan: {
		Code: ProductWorkingCapitalLoan, MinAmount: 500_000, MaxAmount: 30_000_000,
		MinTerm: 6, MaxTerm: 36,
		Rates:               map[RiskGrade]float64{GradeA: 16.0, GradeB: 19.0, GradeC: 23.0},
		CollateralThreshold: &collateral5M,
	},
	ProductRevolvingLineVKL: {
		Code: ProductRevolvingLineVKL, MinAmount: 300_000, MaxAmount: 20_000_000,
		MinTerm: 12, MaxTerm: 36,
		Rates:               map[RiskGrade]float64{GradeA: 17.0, GradeB: 20.0, GradeC: 24.0},
		CollateralThreshold: &collateral3M,
	},
	ProductInvestmentLoan: {
		Code: ProductInvestmentLoan, MinAmount: 1_000_000, MaxAmount: 50_000_000,
		MinTerm: 12, MaxTerm: 60,
		Rates:               map[RiskGrade]float64{GradeA: 14.0, GradeB: 17.0, GradeC: 21.0},
		CollateralThreshold: &collateral3M,
	},
}

var AlternativeProduct = map[ProductType]ProductType{
	ProductWorkingCapitalLoan: ProductRevolvingLineVKL,
	ProductInvestmentLoan:     ProductWorkingCapitalLoan,
	ProductRevolvingLineVKL:   ProductWorkingCapitalLoan,
	ProductOverdraft:          ProductRevolvingLineVKL,
}

type gradeBound struct {
	Grade      RiskGrade
	Lo, Hi     int
	PdLo, PdHi float64
}

var gradeBounds = []gradeBound{
	{GradeA, 800, 1000, 0.005, 0.020},
	{GradeB, 650, 799, 0.020, 0.050},
	{GradeC, 500, 649, 0.050, 0.120},
	{GradeD, 350, 499, 0.120, 0.250},
	{GradeE, 0, 349, 0.250, 0.990},
}

func Score(data EnrichmentBundle) ScoringResult {
	factors := make([]ScoringFactor, 0)
	stopFactors := make([]string, 0)

	ageYears := businessAgeYears(data.Egrul.RegistrationDate)
	ageDelta := ageScore(ageYears)
	factors = append(factors, ScoringFactor{
		FactorName:  "Возраст бизнеса",
		Group:       "EGRUL",
		RawValue:    fmt.Sprintf("%.1f лет", ageYears),
		ScoreDelta:  ageDelta,
		MaxWeight:   120,
		Description: ageDescription(ageYears),
	})
	if ageYears < 0.25 {
		stopFactors = append(stopFactors, "Возраст бизнеса менее 3 месяцев")
	}

	capDelta := capitalScore(data.Egrul.AuthorizedCapital)
	capRaw := "Н/Д (ИП)"
	capDesc := "ИП — уставный капитал не применим"
	if data.Egrul.AuthorizedCapital != nil {
		capRaw = fmt.Sprintf("%.0f ₽", *data.Egrul.AuthorizedCapital)
		capDesc = capRaw
	}
	factors = append(factors, ScoringFactor{
		FactorName:  "Уставный капитал",
		Group:       "EGRUL",
		RawValue:    capRaw,
		ScoreDelta:  capDelta,
		MaxWeight:   40,
		Description: capDesc,
	})

	if data.Egrul.IsLiquidating {
		stopFactors = append(stopFactors, "Компания в процессе ликвидации/банкротства")
		factors = append(factors, ScoringFactor{
			FactorName:  "Ликвидация",
			Group:       "EGRUL",
			RawValue:    "Да",
			ScoreDelta:  -200,
			MaxWeight:   -200,
			Description: "Компания ликвидируется",
		})
	}

	if len(data.Fns.TaxBlocks) > 0 {
		stopFactors = append(stopFactors, "Налоговая блокировка счёта ФНС")
		factors = append(factors, ScoringFactor{
			FactorName:  "Налоговые блокировки",
			Group:       "FNS",
			RawValue:    fmt.Sprintf("%d блокировок", len(data.Fns.TaxBlocks)),
			ScoreDelta:  -200,
			MaxWeight:   -200,
			Description: "Активная блокировка счёта",
		})
	} else {
		factors = append(factors, ScoringFactor{
			FactorName:  "Налоговые блокировки",
			Group:       "FNS",
			RawValue:    "Нет",
			ScoreDelta:  0,
			MaxWeight:   -200,
			Description: "Отсутствуют",
		})
	}

	disc := data.Fns.TaxDiscrepancies
	discDelta := 0
	if disc == 1 {
		discDelta = -40
	} else if disc >= 2 {
		discDelta = -100
	}
	factors = append(factors, ScoringFactor{
		FactorName:  "Налоговые разрывы",
		Group:       "FNS",
		RawValue:    fmt.Sprintf("%d", disc),
		ScoreDelta:  discDelta,
		MaxWeight:   -100,
		Description: fmt.Sprintf("%d расхождений", disc),
	})

	empDelta := employeeScore(data.Fns.EmployeeCount)
	factors = append(factors, ScoringFactor{
		FactorName:  "Численность сотрудников",
		Group:       "FNS",
		RawValue:    fmt.Sprintf("%d", data.Fns.EmployeeCount),
		ScoreDelta:  empDelta,
		MaxWeight:   60,
		Description: fmt.Sprintf("%d чел.", data.Fns.EmployeeCount),
	})

	if data.Bki.Overdue90Plus {
		stopFactors = append(stopFactors, "Просрочка 90+ дней в кредитной истории")
		factors = append(factors, ScoringFactor{
			FactorName:  "Просрочка 90+ дней",
			Group:       "BKI",
			RawValue:    "Да",
			ScoreDelta:  -200,
			MaxWeight:   -200,
			Description: "Критическая просрочка",
		})
	}
	if data.Bki.Overdue60 {
		factors = append(factors, ScoringFactor{
			FactorName:  "Просрочка 60 дней",
			Group:       "BKI",
			RawValue:    "Да",
			ScoreDelta:  -120,
			MaxWeight:   -120,
			Description: "Существенная просрочка",
		})
	}
	if data.Bki.Overdue30 {
		factors = append(factors, ScoringFactor{
			FactorName:  "Просрочка 30 дней",
			Group:       "BKI",
			RawValue:    "Да",
			ScoreDelta:  -60,
			MaxWeight:   -60,
			Description: "Незначительная просрочка",
		})
	}
	if data.Bki.Overdue0 && !data.Bki.Overdue30 {
		factors = append(factors, ScoringFactor{
			FactorName:  "Чистая кредитная история",
			Group:       "BKI",
			RawValue:    "0 дней просрочки",
			ScoreDelta:  100,
			MaxWeight:   100,
			Description: "Действующие кредиты без просрочек",
		})
	} else if data.Bki.ActiveLoans == 0 {
		factors = append(factors, ScoringFactor{
			FactorName:  "Кредитная история",
			Group:       "BKI",
			RawValue:    "Нет кредитов",
			ScoreDelta:  0,
			MaxWeight:   100,
			Description: "Кредитная история отсутствует",
		})
	}

	revenues := data.AlfaAccounts.MonthlyRevenue
	avgRev := 0.0
	if len(revenues) > 0 {
		sum := 0.0
		for _, r := range revenues {
			sum += r
		}
		avgRev = sum / float64(len(revenues))
	}
	revDelta := revenueScore(avgRev)
	factors = append(factors, ScoringFactor{
		FactorName:  "Среднемесячный оборот",
		Group:       "TURNOVER",
		RawValue:    fmt.Sprintf("%.0f ₽", avgRev),
		ScoreDelta:  revDelta,
		MaxWeight:   100,
		Description: revenueDescription(avgRev),
	})

	trendDelta, trendPct := trendScore(revenues)
	factors = append(factors, ScoringFactor{
		FactorName:  "Тренд оборотов (3м vs пред.3м)",
		Group:       "TURNOVER",
		RawValue:    fmt.Sprintf("%+.0f%%", trendPct),
		ScoreDelta:  trendDelta,
		MaxWeight:   80,
		Description: fmt.Sprintf("Изменение %+.1f%%", trendPct),
	})

	ctrDelta := counterpartyScore(data.AlfaAccounts.UniqueCounterparties)
	factors = append(factors, ScoringFactor{
		FactorName:  "Уникальные контрагенты",
		Group:       "TURNOVER",
		RawValue:    fmt.Sprintf("%d", data.AlfaAccounts.UniqueCounterparties),
		ScoreDelta:  ctrDelta,
		MaxWeight:   50,
		Description: fmt.Sprintf("%d контрагентов", data.AlfaAccounts.UniqueCounterparties),
	})

	taxDelta := -30
	taxRaw := "Пропуски"
	taxDesc := "Нерегулярные платежи"
	if data.AlfaAccounts.TaxPaymentsRegular {
		taxDelta = 50
		taxRaw = "Регулярно"
		taxDesc = "Регулярные платежи"
	}
	factors = append(factors, ScoringFactor{
		FactorName:  "Регулярность налоговых платежей",
		Group:       "TURNOVER",
		RawValue:    taxRaw,
		ScoreDelta:  taxDelta,
		MaxWeight:   50,
		Description: taxDesc,
	})

	total := 500
	for _, f := range factors {
		total += f.ScoreDelta
	}
	if total < 0 {
		total = 0
	}
	if total > 1000 {
		total = 1000
	}

	var grade RiskGrade
	var pd float64
	if len(stopFactors) > 0 {
		grade = GradeE
		pd = 0.99
	} else {
		grade = gradeForScore(total)
		pd = pdForScore(total, grade)
	}

	return ScoringResult{
		RiskScore:        total,
		PD:               roundFloat(pd, 4),
		RiskGrade:        grade,
		StopFactors:      stopFactors,
		FactorsBreakdown: factors,
	}
}

func businessAgeYears(regDateStr string) float64 {
	reg, err := time.Parse("2006-01-02", regDateStr)
	if err != nil {
		return 0
	}
	return time.Since(reg).Hours() / 24 / 365.25
}

func ageScore(years float64) int {
	switch {
	case years < 1:
		return -120
	case years < 2:
		return -60
	case years < 3:
		return 0
	case years < 5:
		return 60
	case years < 10:
		return 90
	default:
		return 120
	}
}

func ageDescription(years float64) string {
	switch {
	case years < 1:
		return "Менее 1 года — высокий риск"
	case years < 3:
		return fmt.Sprintf("%.1f лет — молодой бизнес", years)
	case years < 10:
		return fmt.Sprintf("%.1f лет — зрелый бизнес", years)
	default:
		return fmt.Sprintf("%.1f лет — устоявшийся бизнес", years)
	}
}

func capitalScore(cap *float64) int {
	if cap == nil {
		return 0
	}
	c := *cap
	switch {
	case c <= 10_000:
		return -20
	case c <= 100_000:
		return 0
	case c <= 1_000_000:
		return 10
	case c <= 10_000_000:
		return 25
	default:
		return 40
	}
}

func employeeScore(emp int) int {
	switch {
	case emp == 0:
		return -60
	case emp <= 5:
		return 0
	case emp <= 20:
		return 30
	default:
		return 60
	}
}

func revenueScore(avg float64) int {
	switch {
	case avg < 100_000:
		return -60
	case avg < 500_000:
		return 0
	case avg < 2_000_000:
		return 40
	case avg < 10_000_000:
		return 70
	default:
		return 100
	}
}

func revenueDescription(avg float64) string {
	switch {
	case avg < 100_000:
		return "Очень низкий оборот"
	case avg < 500_000:
		return "Низкий оборот"
	case avg < 2_000_000:
		return "Средний оборот"
	case avg < 10_000_000:
		return "Хороший оборот"
	default:
		return "Высокий оборот"
	}
}

func trendScore(monthly []float64) (int, float64) {
	if len(monthly) < 6 {
		return 0, 0
	}
	recent := (monthly[len(monthly)-1] + monthly[len(monthly)-2] + monthly[len(monthly)-3]) / 3
	prev := (monthly[len(monthly)-4] + monthly[len(monthly)-5] + monthly[len(monthly)-6]) / 3
	if prev == 0 {
		return 0, 0
	}
	pct := (recent - prev) / prev * 100
	switch {
	case pct < -30:
		return -80, pct
	case pct < -10:
		return -40, pct
	case pct < 10:
		return 0, pct
	case pct < 30:
		return 40, pct
	default:
		return 80, pct
	}
}

func counterpartyScore(cnt int) int {
	switch {
	case cnt < 3:
		return -30
	case cnt < 10:
		return 0
	case cnt < 30:
		return 25
	default:
		return 50
	}
}

func gradeForScore(score int) RiskGrade {
	for _, b := range gradeBounds {
		if score >= b.Lo && score <= b.Hi {
			return b.Grade
		}
	}
	return GradeE
}

func pdForScore(score int, grade RiskGrade) float64 {
	for _, b := range gradeBounds {
		if b.Grade == grade {
			if b.Hi == b.Lo {
				return (b.PdLo + b.PdHi) / 2
			}
			return b.PdHi - float64(score-b.Lo)/float64(b.Hi-b.Lo)*(b.PdHi-b.PdLo)
		}
	}
	return 0.99
}

func roundFloat(f float64, places int) float64 {
	pow := math.Pow(10, float64(places))
	return math.Round(f*pow) / pow
}

const (
	netMargin         = 0.15
	dtiLimit          = 0.50
	securedMultiplier = 2.0
)

func Decide(scoring ScoringResult, req ApplicationRequest, data EnrichmentBundle, govRateAdj float64) DecisionResult {
	cfg := ProductCatalog[req.ProductType]
	grade := scoring.RiskGrade

	revenues := data.AlfaAccounts.MonthlyRevenue
	avgMonthlyRevenue := 0.0
	if len(revenues) > 0 {
		sum := 0.0
		for _, r := range revenues {
			sum += r
		}
		avgMonthlyRevenue = sum / float64(len(revenues))
	}
	netMonthlyIncome := avgMonthlyRevenue * netMargin
	existingPayments := data.Bki.TotalMonthlyPayment

	maxMonthlyPayment := netMonthlyIncome*dtiLimit - existingPayments
	if maxMonthlyPayment < 0 {
		maxMonthlyPayment = 0
	}
	dti := 1.0
	if netMonthlyIncome > 0 {
		dti = existingPayments / netMonthlyIncome
	}

	baseRate := cfg.Rates[grade]
	if baseRate == 0 {
		baseRate = cfg.Rates[GradeC]
		if baseRate == 0 {
			baseRate = 25.0
		}
	}
	effectiveRate := baseRate + govRateAdj
	if effectiveRate < 1.0 {
		effectiveRate = 1.0
	}

	maxUnsecured := annuityLimit(maxMonthlyPayment, effectiveRate, req.RequestedTermMonths)
	maxSecured := maxUnsecured * securedMultiplier

	softFlags := make([]string, 0)
	if hasSeasonalVolatility(revenues) {
		softFlags = append(softFlags, "seasonal_volatility")
	}
	if len(data.Egrul.Founders) == 1 {
		softFlags = append(softFlags, "single_founder")
	}
	if data.AlfaAccounts.UniqueCounterparties < 10 {
		softFlags = append(softFlags, "few_counterparties")
	}
	if data.Bki.CreditHistoryMonths < 24 {
		softFlags = append(softFlags, "short_credit_history")
	}

	offers := make([]CreditOffer, 0)
	var rehab *RehabilitationPlan
	var decision Decision

	switch {
	case len(scoring.StopFactors) > 0:
		decision = DecisionRejected
		r := buildRehabPlan(scoring.StopFactors)
		rehab = &r

	case grade == GradeD || grade == GradeE:
		decision = DecisionRejected
		reasons := []string{fmt.Sprintf("Высокий риск: Grade %s, PD %.1f%%", grade, scoring.PD*100)}
		r := buildRehabPlan(reasons)
		rehab = &r

	case grade == GradeC && len(softFlags) > 0:
		decision = DecisionManualReview

	case req.RequestedAmount <= maxUnsecured && (grade == GradeA || grade == GradeB):
		decision = DecisionApproved
		monthly := annuityPayment(req.RequestedAmount, effectiveRate, req.RequestedTermMonths)
		offers = append(offers, CreditOffer{
			VariantIndex:       1,
			ProductType:        req.ProductType,
			ApprovedAmount:     req.RequestedAmount,
			TermMonths:         req.RequestedTermMonths,
			AnnualRatePct:      effectiveRate,
			MonthlyPayment:     roundFloat(monthly, 2),
			CollateralRequired: false,
			Description:        "Одобрено на запрошенных условиях",
		})

	default:
		decision = DecisionCounterOffer
		offers = generateCounterOffers(req, cfg, grade, effectiveRate, maxUnsecured, maxSecured)
	}

	return DecisionResult{
		Decision:           decision,
		MaxMonthlyPayment:  roundFloat(maxMonthlyPayment, 2),
		MaxUnsecuredLimit:  roundFloat(maxUnsecured, 2),
		MaxSecuredLimit:    roundFloat(maxSecured, 2),
		DtiRatio:           roundFloat(dti, 4),
		Offers:             offers,
		RehabilitationPlan: rehab,
		SoftFlags:          softFlags,
	}
}

func generateCounterOffers(req ApplicationRequest, cfg ProductConfig, grade RiskGrade, rate, maxUnsecured, maxSecured float64) []CreditOffer {
	offers := make([]CreditOffer, 0)

	amount1 := maxUnsecured
	if amount1 > cfg.MaxAmount {
		amount1 = cfg.MaxAmount
	}
	if amount1 < cfg.MinAmount {
		amount1 = cfg.MinAmount
	}
	pmt1 := annuityPayment(amount1, rate, req.RequestedTermMonths)
	collNil := (*string)(nil)
	offers = append(offers, CreditOffer{
		VariantIndex:          1,
		ProductType:           req.ProductType,
		ApprovedAmount:        roundFloat(amount1, 2),
		TermMonths:            req.RequestedTermMonths,
		AnnualRatePct:         rate,
		MonthlyPayment:        roundFloat(pmt1, 2),
		CollateralRequired:    false,
		CollateralDescription: collNil,
		Description:           "Сниженная сумма без обеспечения — доступна прямо сейчас",
	})

	amount2 := req.RequestedAmount
	if amount2 > maxSecured {
		amount2 = maxSecured
	}
	if amount2 > cfg.MaxAmount {
		amount2 = cfg.MaxAmount
	}
	rate2 := rate - 1.0
	if rate2 < 1.0 {
		rate2 = 1.0
	}
	pmt2 := annuityPayment(amount2, rate2, req.RequestedTermMonths)
	collDesc := "Залог имущества или поручительство Корпорации МСП"
	offers = append(offers, CreditOffer{
		VariantIndex:          2,
		ProductType:           req.ProductType,
		ApprovedAmount:        roundFloat(amount2, 2),
		TermMonths:            req.RequestedTermMonths,
		AnnualRatePct:         rate2,
		MonthlyPayment:        roundFloat(pmt2, 2),
		CollateralRequired:    true,
		CollateralDescription: &collDesc,
		Description:           "Запрошенная сумма под обеспечение / гарантию Корпорации МСП",
	})

	altProductType, ok := AlternativeProduct[req.ProductType]
	if !ok {
		altProductType = req.ProductType
	}
	altCfg := ProductCatalog[altProductType]
	altTerm := int(float64(req.RequestedTermMonths) * 1.5)
	if altTerm > altCfg.MaxTerm {
		altTerm = altCfg.MaxTerm
	}
	altRate := altCfg.Rates[grade]
	if altRate == 0 {
		altRate = 25.0
	}
	altRate += 1.0
	altAmount := req.RequestedAmount
	if altAmount > altCfg.MaxAmount {
		altAmount = altCfg.MaxAmount
	}
	if altAmount < altCfg.MinAmount {
		altAmount = altCfg.MinAmount
	}
	pmt3 := annuityPayment(altAmount, altRate, altTerm)
	offers = append(offers, CreditOffer{
		VariantIndex:          3,
		ProductType:           altProductType,
		ApprovedAmount:        roundFloat(altAmount, 2),
		TermMonths:            altTerm,
		AnnualRatePct:         altRate,
		MonthlyPayment:        roundFloat(pmt3, 2),
		CollateralRequired:    false,
		CollateralDescription: collNil,
		Description:           fmt.Sprintf("Альтернативный продукт: %s с увеличенным сроком", altProductType),
	})

	return offers
}

func buildRehabPlan(reasons []string) RehabilitationPlan {
	type planEntry struct {
		keyword  string
		action   string
		days     int
		priority string
	}
	entries := []planEntry{
		{"блокировка", "Погасить налоговую задолженность и снять блокировку счёта ФНС", 14, "HIGH"},
		{"90+", "Погасить просрочку и дождаться обновления данных в БКИ", 30, "HIGH"},
		{"3 месяцев", "Накопить историю оборотов по расчётному счёту", 60, "MEDIUM"},
		{"ликвидац", "Отменить процедуру ликвидации, получить выписку ЕГРЮЛ", 30, "HIGH"},
		{"риск", "Снизить долговую нагрузку и улучшить финансовые показатели", 45, "MEDIUM"},
	}

	items := make([]ActionItem, 0)
	maxDays := 0
	for _, reason := range reasons {
		for _, e := range entries {
			if containsInsensitive(reason, e.keyword) {
				items = append(items, ActionItem{
					Action:       e.action,
					DeadlineDays: e.days,
					Priority:     e.priority,
				})
				if e.days > maxDays {
					maxDays = e.days
				}
				break
			}
		}
	}
	if len(items) == 0 {
		items = append(items, ActionItem{
			Action:       "Улучшить финансовые показатели и обратиться повторно",
			DeadlineDays: 45,
			Priority:     "MEDIUM",
		})
		maxDays = 45
	}

	reapplyDate := time.Now().AddDate(0, 0, maxDays).Format("2006-01-02")
	return RehabilitationPlan{
		DurationDays:        maxDays,
		RejectionReasons:    reasons,
		ActionItems:         items,
		EstimatedGradeAfter: "C",
		ReapplyEligibleDate: reapplyDate,
	}
}

func hasSeasonalVolatility(monthly []float64) bool {
	if len(monthly) < 6 {
		return false
	}
	avg := 0.0
	for _, v := range monthly {
		avg += v
	}
	avg /= float64(len(monthly))
	if avg == 0 {
		return false
	}
	maxDev := 0.0
	for _, v := range monthly {
		dev := math.Abs(v-avg) / avg
		if dev > maxDev {
			maxDev = dev
		}
	}
	return maxDev > 0.35
}

func annuityPayment(principal, annualRate float64, termMonths int) float64 {
	if termMonths <= 0 {
		return 0
	}
	if annualRate == 0 {
		return principal / float64(termMonths)
	}
	r := annualRate / 100.0 / 12.0
	return principal * r / (1 - math.Pow(1+r, float64(-termMonths)))
}

func annuityLimit(maxPayment, annualRate float64, termMonths int) float64 {
	if annualRate == 0 || termMonths == 0 || maxPayment <= 0 {
		return 0
	}
	r := annualRate / 100.0 / 12.0
	factor := r / (1 - math.Pow(1+r, float64(-termMonths)))
	if factor == 0 {
		return 0
	}
	return maxPayment / factor
}

func containsInsensitive(s, substr string) bool {
	return strings.Contains(strings.ToLower(s), strings.ToLower(substr))
}
