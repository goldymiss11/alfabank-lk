package conveyor

import "strings"

type NewsItem struct {
	ID                   string   `json:"id"`
	Title                string   `json:"title"`
	Body                 string   `json:"body"`
	ProgramType          string   `json:"program_type"`
	MaxRatePct           *float64 `json:"max_rate_pct,omitempty"`
	GuaranteePct         *float64 `json:"guarantee_pct,omitempty"`
	ApplicableToProducts []string `json:"applicable_to_products"`
	OkvedPrefixes        []string `json:"-"`
}

func ptr(f float64) *float64 { return &f }

var GovSupportNews = []NewsItem{
	{
		ID: "news_1", Title: "Льготный кредит для общепита до 13.5% (Программа 1764)",
		Body:                 "Субсидирование процентной ставки для предприятий общественного питания по программе Минэкономразвития 1764.",
		ProgramType:          "SUBSIDIZED_RATE",
		MaxRatePct:           ptr(13.5),
		ApplicableToProducts: []string{"WORKING_CAPITAL_LOAN", "OVERDRAFT"},
		OkvedPrefixes:        []string{"56"},
	},
	{
		ID: "news_2", Title: "Грант до 500К на открытие точки общепита",
		Body:                 "Безвозвратная субсидия на аренду, ремонт и оборудование для новых точек общественного питания.",
		ProgramType:          "GRANT",
		ApplicableToProducts: []string{"ALL"},
		OkvedPrefixes:        []string{"56"},
	},
	{
		ID: "news_3", Title: "Льготное кредитование производств до 9%",
		Body:                 "Субсидированная ставка для обрабатывающих производств в рамках национального проекта.",
		ProgramType:          "SUBSIDIZED_RATE",
		MaxRatePct:           ptr(9.0),
		ApplicableToProducts: []string{"INVESTMENT_LOAN", "WORKING_CAPITAL_LOAN"},
		OkvedPrefixes:        []string{"25", "28", "29"},
	},
	{
		ID: "news_4", Title: "Гарантия Корпорации МСП до 70%",
		Body:                 "Зонтичная гарантия для производственных предприятий при получении кредита.",
		ProgramType:          "GUARANTEE_MSP",
		GuaranteePct:         ptr(70.0),
		ApplicableToProducts: []string{"INVESTMENT_LOAN", "WORKING_CAPITAL_LOAN"},
		OkvedPrefixes:        []string{"25", "28", "29"},
	},
	{
		ID: "news_5", Title: "Субсидированная ставка для логистики 12%",
		Body:                 "Льготное кредитование для транспортно-логистических компаний.",
		ProgramType:          "SUBSIDIZED_RATE",
		MaxRatePct:           ptr(12.0),
		ApplicableToProducts: []string{"WORKING_CAPITAL_LOAN", "REVOLVING_LINE_VKL"},
		OkvedPrefixes:        []string{"49", "52"},
	},
	{
		ID: "news_6", Title: "Инвестиционный вычет на обновление автопарка",
		Body:                 "Налоговый инвестиционный вычет на приобретение транспортных средств для бизнеса.",
		ProgramType:          "TAX_BENEFIT",
		ApplicableToProducts: []string{"INVESTMENT_LOAN"},
		OkvedPrefixes:        []string{"49", "52"},
	},
	{
		ID: "news_7", Title: "Зонтичная гарантия для оптовой торговли до 50%",
		Body:                 "Гарантия Корпорации МСП для предприятий оптовой торговли.",
		ProgramType:          "GUARANTEE_MSP",
		GuaranteePct:         ptr(50.0),
		ApplicableToProducts: []string{"WORKING_CAPITAL_LOAN", "REVOLVING_LINE_VKL"},
		OkvedPrefixes:        []string{"46"},
	},
	{
		ID: "news_8", Title: "Программа «Дальневосточная ипотека для бизнеса» до 10%",
		Body:                 "Льготное кредитование для бизнеса на территории Дальнего Востока.",
		ProgramType:          "SUBSIDIZED_RATE",
		MaxRatePct:           ptr(10.0),
		ApplicableToProducts: []string{"INVESTMENT_LOAN", "WORKING_CAPITAL_LOAN"},
		OkvedPrefixes:        []string{"ALL"},
	},
}

func GetNewsForOkved(okvedPrefix string) []NewsItem {
	var result []NewsItem
	prefix := strings.TrimSpace(okvedPrefix)
	for _, item := range GovSupportNews {
		for _, p := range item.OkvedPrefixes {
			if p == "ALL" || prefix == "ALL" || strings.HasPrefix(prefix, p) || strings.HasPrefix(p, prefix) {
				result = append(result, item)
				break
			}
		}
	}
	if len(result) == 0 {

		for _, item := range GovSupportNews {
			for _, p := range item.OkvedPrefixes {
				if p == "ALL" {
					result = append(result, item)
					break
				}
			}
		}
	}
	return result
}

func AIFallbackAnswer(message string) map[string]interface{} {
	msg := strings.ToLower(message)

	type rule struct {
		keywords    []string
		response    string
		suggestions []string
	}

	rules := []rule{
		{
			keywords: []string{"овердрафт", "overdraft"},
			response: "Овердрафт — краткосрочный кредитный лимит на расчётном счёте. Доступен от 50 тыс. до 3 млн ₽ на срок 3–12 месяцев. Ставка от 18% годовых. Рекомендуется для покрытия кассовых разрывов.",
			suggestions: []string{"Сколько нужна сумма?", "Какой срок?", "Есть ли залог?"},
		},
		{
			keywords: []string{"оборотный", "working capital"},
			response: "Оборотный кредит подходит для пополнения оборотных средств: закупка товаров, сырья, расходных материалов. Сумма от 500 тыс. до 30 млн ₽, срок 6–36 мес., ставка от 16%.",
			suggestions: []string{"Какой оборот за месяц?", "На что нужны средства?"},
		},
		{
			keywords: []string{"инвестиц", "investment"},
			response: "Инвестиционный кредит — для капитальных вложений: покупка оборудования, недвижимости, модернизация. Сумма до 50 млн ₽, срок до 5 лет, ставка от 14%.",
			suggestions: []string{"Что планируете приобрести?", "Какая стоимость актива?"},
		},
		{
			keywords: []string{"скоринг", "рейтинг", "оценка", "балл"},
			response: "Скоринговая оценка рассчитывается на основе: возраста бизнеса, оборотов по счёту, кредитной истории, данных ФНС и ЕГРЮЛ. Базовый балл 500, максимум 1000. Grade A (800+) — лучшие условия.",
			suggestions: []string{"Какой у меня скоринг?", "Как улучшить рейтинг?"},
		},
		{
			keywords: []string{"отказ", "rejected", "отклон"},
			response: "Отказ может быть связан со стоп-факторами: налоговые блокировки ФНС, просрочки 90+ дней в БКИ, ликвидация компании. Устраните стоп-факторы и подайте повторно.",
			suggestions: []string{"Как устранить блокировку?", "Когда можно подать повторно?"},
		},
		{
			keywords: []string{"господдержка", "льгот", "субсид", "программ"},
			response: "Доступны программы господдержки: льготные ставки (от 9%), гарантии Корпорации МСП до 70%, гранты для отдельных отраслей. Подберём по вашему ОКВЭД.",
			suggestions: []string{"Покажи программы для моей отрасли", "Как применить программу?"},
		},
		{
			keywords: []string{"залог", "обеспечение", "collateral"},
			response: "Залог требуется при сумме более 3–5 млн ₽ в зависимости от продукта. Принимается недвижимость, оборудование, поручительство Корпорации МСП.",
			suggestions: []string{"Какой залог подходит?", "Можно без залога?"},
		},
		{
			keywords: []string{"документ", "справка", "осв", "баланс"},
			response: "Для заявки обычно нужны: ОСВ (оборотно-сальдовая ведомость), бухгалтерский баланс, налоговая декларация. Загрузите документы в разделе «Документы» заявки.",
			suggestions: []string{"Какие форматы принимаются?", "Загрузить документы"},
		},
		{
			keywords: []string{"ставк", "процент", "rate"},
			response: "Процентная ставка зависит от кредитного рейтинга: Grade A — от 14%, Grade B — от 17%, Grade C — от 21%. При господдержке ставка снижается дополнительно.",
			suggestions: []string{"Мой рейтинг?", "Есть льготные программы?"},
		},
	}

	for _, r := range rules {
		for _, kw := range r.keywords {
			if strings.Contains(msg, kw) {
				return map[string]interface{}{
					"response":    r.response,
					"source":      "fallback",
					"suggestions": r.suggestions,
				}
			}
		}
	}

	return map[string]interface{}{
		"response":    "Я помогу подобрать оптимальный кредитный продукт для вашего бизнеса. Расскажите, какая сумма нужна, на какой срок и для каких целей?",
		"source":      "fallback",
		"suggestions": []string{"Оборотный кредит", "Овердрафт", "Инвестиционный кредит", "Программы господдержки"},
	}
}

