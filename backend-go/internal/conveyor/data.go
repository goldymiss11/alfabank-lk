package conveyor

// SyntheticPreset — один из 5 демо-профилей
type SyntheticPreset struct {
	PresetID        string
	Label           string
	ExpectedOutcome string
	Company         *CompanyProfile
	Application     *ApplicationRequest
	Enrichment      *EnrichmentBundle
}

type CompanyProfile struct {
	INN               string
	OGRN              string
	Name              string
	FullName          string
	LegalForm         string
	OkvedMain         string
	OkvedDescription  string
	RegistrationDate  string
	AuthorizedCapital *float64
	Address           string
	EmployeeCount     int
	IsActive          bool
}

var cap5M = 5_000_000.0
var cap10K_p = 10_000.0
var nil_cap *float64 = nil

// BuildPresets возвращает 5 синтетических профилей
func BuildPresets() []SyntheticPreset {
	capNil := (*float64)(nil)
	cap5m := 5_000_000.0
	cap10k := 10_000.0

	return []SyntheticPreset{
		// Пресет 1: ИП Кофеева — Автоодобрение
		{
			PresetID:        "coffee_shop_ip",
			Label:           "☕ ИП Кофеева — Авто-одобрение овердрафта",
			ExpectedOutcome: "APPROVED",
			Company: &CompanyProfile{
				INN: "771234567890", OGRN: "321774600012345",
				Name: "ИП Кофеева Анна Михайловна", FullName: "ИП Кофеева Анна Михайловна",
				LegalForm: "IP", OkvedMain: "56.10.1",
				OkvedDescription: "Деятельность ресторанов и услуги по доставке продуктов питания",
				RegistrationDate: "2019-03-15", AuthorizedCapital: capNil,
				Address: "г. Москва, ул. Арбат, 10", EmployeeCount: 8, IsActive: true,
			},
			Application: &ApplicationRequest{
				CompanyINN:          "771234567890",
				ProductType:         ProductOverdraft,
				RequestedAmount:     500_000,
				RequestedTermMonths: 12,
			},
			Enrichment: &EnrichmentBundle{
				Egrul: EgrulData{RegistrationDate: "2019-03-15", AuthorizedCapital: capNil, IsLiquidating: false,
					Founders: []map[string]interface{}{}},
				Fns: FnsData{TaxBlocks: []map[string]string{}, TaxDiscrepancies: 0, EmployeeCount: 8},
				Bki: BkiData{ActiveLoans: 1, TotalMonthlyPayment: 25_000,
					Overdue0: true, Overdue30: false, Overdue60: false, Overdue90Plus: false, CreditHistoryMonths: 60},
				AlfaAccounts: AlfaAccountsData{
					MonthlyRevenue:       []float64{620000, 580000, 650000, 700000, 710000, 680000, 720000, 750000, 690000, 730000, 760000, 800000},
					AvgBalance:           420_000,
					UniqueCounterparties: 35,
					TaxPaymentsRegular:   true,
				},
			},
		},
		// Пресет 2: ООО ТехноСтрой — Counter-Offer
		{
			PresetID:        "manufacturing_ooo",
			Label:           "🏭 ООО ТехноСтрой — Counter-Offer (3 альтернативы)",
			ExpectedOutcome: "COUNTER_OFFER",
			Company: &CompanyProfile{
				INN: "7702123456", OGRN: "1167746123456",
				Name: "ООО «ТехноСтрой Инновации»", FullName: "Общество с ограниченной ответственностью «ТехноСтрой Инновации»",
				LegalForm: "OOO", OkvedMain: "25.11",
				OkvedDescription: "Производство строительных металлических конструкций",
				RegistrationDate: "2016-06-20", AuthorizedCapital: &cap5m,
				Address: "г. Екатеринбург, пр. Ленина, 44", EmployeeCount: 42, IsActive: true,
			},
			Application: &ApplicationRequest{
				CompanyINN:          "7702123456",
				ProductType:         ProductWorkingCapitalLoan,
				RequestedAmount:     20_000_000,
				RequestedTermMonths: 24,
			},
			Enrichment: &EnrichmentBundle{
				Egrul: EgrulData{RegistrationDate: "2016-06-20", AuthorizedCapital: &cap5m, IsLiquidating: false,
					Founders: []map[string]interface{}{{"name": "Иванов И.И.", "share_pct": 60}, {"name": "Петров П.П.", "share_pct": 40}}},
				Fns: FnsData{TaxBlocks: []map[string]string{}, TaxDiscrepancies: 0, EmployeeCount: 42},
				Bki: BkiData{ActiveLoans: 2, TotalMonthlyPayment: 180_000,
					Overdue0: true, Overdue30: false, Overdue60: false, Overdue90Plus: false, CreditHistoryMonths: 72},
				AlfaAccounts: AlfaAccountsData{
					MonthlyRevenue:       []float64{4200000, 4500000, 4100000, 4800000, 5000000, 4700000, 5200000, 5500000, 5100000, 5300000, 5600000, 5800000},
					AvgBalance:           2_100_000,
					UniqueCounterparties: 28,
					TaxPaymentsRegular:   true,
				},
			},
		},
		// Пресет 3: ООО ЛогиТранс — Manual Review
		{
			PresetID:        "logistics_seasonal",
			Label:           "🚛 ООО ЛогиТранс — Ручной разбор + уточнение",
			ExpectedOutcome: "MANUAL_REVIEW",
			Company: &CompanyProfile{
				INN: "5001234567", OGRN: "1185001234567",
				Name: "ООО «ЛогиТранс»", FullName: "Общество с ограниченной ответственностью «ЛогиТранс»",
				LegalForm: "OOO", OkvedMain: "49.41",
				OkvedDescription: "Перевозка грузов специализированными автотранспортными средствами",
				RegistrationDate: "2024-03-15", AuthorizedCapital: &cap10k,
				Address: "г. Новосибирск, ул. Дуси Ковальчук, 179", EmployeeCount: 7, IsActive: true,
			},
			Application: &ApplicationRequest{
				CompanyINN:          "5001234567",
				ProductType:         ProductRevolvingLineVKL,
				RequestedAmount:     3_000_000,
				RequestedTermMonths: 24,
			},
			Enrichment: &EnrichmentBundle{
				Egrul: EgrulData{RegistrationDate: "2024-03-15", AuthorizedCapital: &cap10k, IsLiquidating: false,
					Founders: []map[string]interface{}{{"name": "Сидоров С.С.", "share_pct": 100}}},
				Fns: FnsData{TaxBlocks: []map[string]string{}, TaxDiscrepancies: 2, EmployeeCount: 7},
				Bki: BkiData{ActiveLoans: 1, TotalMonthlyPayment: 85_000,
					Overdue0: true, Overdue30: false, Overdue60: false, Overdue90Plus: false, CreditHistoryMonths: 18},
				AlfaAccounts: AlfaAccountsData{
					MonthlyRevenue:       []float64{1800000, 1600000, 1200000, 900000, 700000, 600000, 800000, 1000000, 1300000, 1500000, 1700000, 1900000},
					AvgBalance:           280_000,
					UniqueCounterparties: 8,
					TaxPaymentsRegular:   false,
				},
			},
		},
		// Пресет 4: ООО ОптТрейд — Rejected
		{
			PresetID:        "wholesale_rejected",
			Label:           "⛔ ООО ОптТрейд — Отказ + План реабилитации",
			ExpectedOutcome: "REJECTED",
			Company: &CompanyProfile{
				INN: "7725987654", OGRN: "1207700987654",
				Name: "ООО «ОптТрейд»", FullName: "Общество с ограниченной ответственностью «ОптТрейд»",
				LegalForm: "OOO", OkvedMain: "46.73",
				OkvedDescription: "Торговля оптовая лесоматериалами, строительными материалами",
				RegistrationDate: "2020-11-05", AuthorizedCapital: &cap10k,
				Address: "г. Самара, ул. Советской Армии, 200", EmployeeCount: 3, IsActive: true,
			},
			Application: &ApplicationRequest{
				CompanyINN:          "7725987654",
				ProductType:         ProductWorkingCapitalLoan,
				RequestedAmount:     10_000_000,
				RequestedTermMonths: 18,
			},
			Enrichment: &EnrichmentBundle{
				Egrul: EgrulData{RegistrationDate: "2020-11-05", AuthorizedCapital: &cap10k, IsLiquidating: false,
					Founders: []map[string]interface{}{{"name": "Козлов К.К.", "share_pct": 100}}},
				Fns: FnsData{
					TaxBlocks:        []map[string]string{{"type": "ACCOUNT_BLOCK", "reason": "Непредставление декларации", "date": "2026-08-15"}},
					TaxDiscrepancies: 3, EmployeeCount: 3,
				},
				Bki: BkiData{ActiveLoans: 3, TotalMonthlyPayment: 320_000,
					Overdue0: false, Overdue30: true, Overdue60: true, Overdue90Plus: true, CreditHistoryMonths: 36},
				AlfaAccounts: AlfaAccountsData{
					MonthlyRevenue:       []float64{800000, 750000, 600000, 500000, 450000, 400000, 350000, 300000, 280000, 250000, 200000, 150000},
					AvgBalance:           45_000,
					UniqueCounterparties: 4,
					TaxPaymentsRegular:   false,
				},
			},
		},
		// Пресет 5: Свой ввод
		{
			PresetID:        "custom_input",
			Label:           "✏️ Свой ввод — заполните форму вручную",
			ExpectedOutcome: "DEPENDS_ON_INPUT",
			Company:         nil,
			Application:     nil,
			Enrichment:      nil,
		},
	}
}
