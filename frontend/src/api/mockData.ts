// PRESET: coffee_shop_ip
export const preset_coffee_shop_ip = {
  "id": "7e6a1672-7f0b-437d-894a-f8a2b786359c",
  "company_id": "f1e85344-90bb-4a70-b4fd-4ec0f3960bf6",
  "company": {
    "id": "f1e85344-90bb-4a70-b4fd-4ec0f3960bf6",
    "inn": "771234567890",
    "ogrn": "321774600012345",
    "name": "ИП Кофеева Анна Михайловна",
    "full_name": "ИП Кофеева Анна Михайловна",
    "legal_form": "IP",
    "okved_main": "56.10.1",
    "okved_description": "Деятельность ресторанов и услуги по доставке продуктов питания",
    "registration_date": "2019-03-15",
    "authorized_capital": null,
    "address": "г. Москва, ул. Арбат, 10",
    "employee_count": 8,
    "is_active": true
  },
  "owner_user_id": "25a35dc2-f552-46e3-bd45-53dd43994687",
  "accountant_user_id": "7e1459ed-e3f9-4d76-af34-9a0e2f7b0aa4",
  "product_type": "OVERDRAFT",
  "requested_amount": 500000,
  "requested_term_months": 12,
  "gov_program_id": null,
  "state": "APPROVED",
  "scoring_result": {
    "risk_score": 860,
    "pd": 0.0155,
    "risk_grade": "A",
    "stop_factors": [],
    "factors_breakdown": [
      {
        "factor_name": "Возраст бизнеса",
        "group": "EGRUL",
        "raw_value": "7.6 лет",
        "score_delta": 90,
        "max_weight": 120,
        "description": "7.6 лет — зрелый бизнес"
      },
      {
        "factor_name": "Уставный капитал",
        "group": "EGRUL",
        "raw_value": "Н/Д (ИП)",
        "score_delta": 0,
        "max_weight": 40,
        "description": "ИП — уставный капитал не применим"
      },
      {
        "factor_name": "Налоговые блокировки",
        "group": "FNS",
        "raw_value": "Нет",
        "score_delta": 0,
        "max_weight": -200,
        "description": "Отсутствуют"
      },
      {
        "factor_name": "Налоговые разрывы",
        "group": "FNS",
        "raw_value": "0",
        "score_delta": 0,
        "max_weight": -100,
        "description": "0 расхождений"
      },
      {
        "factor_name": "Численность сотрудников",
        "group": "FNS",
        "raw_value": "8",
        "score_delta": 30,
        "max_weight": 60,
        "description": "8 чел."
      },
      {
        "factor_name": "Чистая кредитная история",
        "group": "BKI",
        "raw_value": "0 дней просрочки",
        "score_delta": 100,
        "max_weight": 100,
        "description": "Действующие кредиты без просрочек"
      },
      {
        "factor_name": "Среднемесячный оборот",
        "group": "TURNOVER",
        "raw_value": "699167 ₽",
        "score_delta": 40,
        "max_weight": 100,
        "description": "Средний оборот"
      },
      {
        "factor_name": "Тренд оборотов (3м vs пред.3м)",
        "group": "TURNOVER",
        "raw_value": "+6%",
        "score_delta": 0,
        "max_weight": 80,
        "description": "Изменение +6.0%"
      },
      {
        "factor_name": "Уникальные контрагенты",
        "group": "TURNOVER",
        "raw_value": "35",
        "score_delta": 50,
        "max_weight": 50,
        "description": "35 контрагентов"
      },
      {
        "factor_name": "Регулярность налоговых платежей",
        "group": "TURNOVER",
        "raw_value": "Регулярно",
        "score_delta": 50,
        "max_weight": 50,
        "description": "Регулярные платежи"
      }
    ]
  },
  "decision_result": {
    "decision": "APPROVED",
    "max_monthly_payment": 52437.5,
    "max_unsecured_limit": 571962.3,
    "max_secured_limit": 1143924.61,
    "dti_ratio": 0,
    "offers": [
      {
        "variant_index": 1,
        "product_type": "OVERDRAFT",
        "approved_amount": 500000,
        "term_months": 12,
        "annual_rate_pct": 18,
        "monthly_payment": 45840,
        "collateral_required": false,
        "collateral_description": null,
        "description": "Одобрено на запрошенных условиях"
      }
    ],
    "rehabilitation_plan": null,
    "soft_flags": []
  },
  "offers": [
    {
      "variant_index": 1,
      "product_type": "OVERDRAFT",
      "approved_amount": 500000,
      "term_months": 12,
      "annual_rate_pct": 18,
      "monthly_payment": 45840,
      "collateral_required": false,
      "collateral_description": null,
      "description": "Одобрено на запрошенных условиях"
    }
  ],
  "rehabilitation_plan": null,
  "enrichment_snapshots": {
    "egrul": {
      "registration_date": "2019-03-15",
      "authorized_capital": null,
      "okved_main": "",
      "is_liquidating": false,
      "founders": []
    },
    "fns": {
      "tax_blocks": [],
      "tax_discrepancies": 0,
      "employee_count": 8
    },
    "bki": {
      "active_loans": 0,
      "total_monthly_payment": 0,
      "overdue_0": true,
      "overdue_30": false,
      "overdue_60": false,
      "overdue_90_plus": false,
      "credit_history_months": 60
    },
    "alfa_accounts": {
      "monthly_revenue": [
        620000,
        580000,
        650000,
        700000,
        710000,
        680000,
        720000,
        750000,
        690000,
        730000,
        760000,
        800000
      ],
      "avg_balance": 420000,
      "unique_counterparties": 35,
      "tax_payments_regular": true
    }
  },
  "audit_log": [
    {
      "id": "bc1934d8-e9a8-4d76-9ca4-196205a3fafd",
      "application_id": "7e6a1672-7f0b-437d-894a-f8a2b786359c",
      "from_state": null,
      "to_state": "DRAFT",
      "trigger": "INIT_PRESET",
      "actor_type": "SYSTEM_CONVEYOR",
      "actor_id": null,
      "details_json": {},
      "created_at": "2026-10-26T10:09:28Z"
    },
    {
      "id": "6f73d2ba-b7ee-4880-8975-7746d2599e05",
      "application_id": "7e6a1672-7f0b-437d-894a-f8a2b786359c",
      "from_state": "DRAFT",
      "to_state": "SUBMITTED",
      "trigger": "SUBMIT",
      "actor_type": "CLIENT_OWNER",
      "actor_id": null,
      "details_json": {},
      "created_at": "2026-10-26T10:09:28Z"
    },
    {
      "id": "473f8b0c-5266-4156-9f15-e46ab8bf8108",
      "application_id": "7e6a1672-7f0b-437d-894a-f8a2b786359c",
      "from_state": "SUBMITTED",
      "to_state": "VALIDATION",
      "trigger": "AUTO_VALIDATE",
      "actor_type": "SYSTEM_CONVEYOR",
      "actor_id": null,
      "details_json": {},
      "created_at": "2026-10-26T10:09:28Z"
    },
    {
      "id": "c420e31f-129f-44ac-aad7-2cc8e10d1c96",
      "application_id": "7e6a1672-7f0b-437d-894a-f8a2b786359c",
      "from_state": "VALIDATION",
      "to_state": "ENRICHMENT",
      "trigger": "VALIDATION_PASSED",
      "actor_type": "SYSTEM_CONVEYOR",
      "actor_id": null,
      "details_json": {},
      "created_at": "2026-10-26T10:09:28Z"
    },
    {
      "id": "08b01b37-9a98-42f3-a154-bddfac6ba8e3",
      "application_id": "7e6a1672-7f0b-437d-894a-f8a2b786359c",
      "from_state": "ENRICHMENT",
      "to_state": "SCORING_AND_POLICY",
      "trigger": "ENRICHMENT_COMPLETE",
      "actor_type": "SYSTEM_CONVEYOR",
      "actor_id": null,
      "details_json": {},
      "created_at": "2026-10-26T10:09:28Z"
    },
    {
      "id": "b79f0643-03bf-46a1-85d3-07097b15ef6c",
      "application_id": "7e6a1672-7f0b-437d-894a-f8a2b786359c",
      "from_state": "SCORING_AND_POLICY",
      "to_state": "APPROVED",
      "trigger": "AUTO_APPROVE",
      "actor_type": "SYSTEM_CONVEYOR",
      "actor_id": null,
      "details_json": {},
      "created_at": "2026-10-26T10:09:28Z"
    }
  ],
  "clarifications": [],
  "documents": [],
  "delegated_to_accountant": false,
  "created_at": "2026-10-26T10:09:28Z",
  "updated_at": "2026-10-26T10:09:28Z"
};

// PRESET: manufacturing_ooo
export const preset_manufacturing_ooo = {
  "id": "d1a4aa81-6af6-4b8c-b3f4-002dc12fe8ca",
  "company_id": "8aa9d1f7-6a45-47ca-929d-cd42d4cc26ce",
  "company": {
    "id": "8aa9d1f7-6a45-47ca-929d-cd42d4cc26ce",
    "inn": "7702123456",
    "ogrn": "1167746123456",
    "name": "ООО «ТехноСтрой Инновации»",
    "full_name": "Общество с ограниченной ответственностью «ТехноСтрой Инновации»",
    "legal_form": "OOO",
    "okved_main": "25.11",
    "okved_description": "Производство строительных металлических конструкций",
    "registration_date": "2016-06-20",
    "authorized_capital": 5000000,
    "address": "г. Екатеринбург, пр. Ленина, 44",
    "employee_count": 42,
    "is_active": true
  },
  "owner_user_id": "122765b5-8d00-479d-8545-1b7b7f0a9f15",
  "accountant_user_id": "1d3d8850-9428-4421-833b-5d2fc71f924f",
  "product_type": "WORKING_CAPITAL_LOAN",
  "requested_amount": 20000000,
  "requested_term_months": 24,
  "gov_program_id": null,
  "state": "COUNTER_OFFER",
  "scoring_result": {
    "risk_score": 950,
    "pd": 0.0088,
    "risk_grade": "A",
    "stop_factors": [],
    "factors_breakdown": [
      {
        "factor_name": "Возраст бизнеса",
        "group": "EGRUL",
        "raw_value": "10.4 лет",
        "score_delta": 120,
        "max_weight": 120,
        "description": "10.4 лет — устоявшийся бизнес"
      },
      {
        "factor_name": "Уставный капитал",
        "group": "EGRUL",
        "raw_value": "5000000 ₽",
        "score_delta": 25,
        "max_weight": 40,
        "description": "5000000 ₽"
      },
      {
        "factor_name": "Налоговые блокировки",
        "group": "FNS",
        "raw_value": "Нет",
        "score_delta": 0,
        "max_weight": -200,
        "description": "Отсутствуют"
      },
      {
        "factor_name": "Налоговые разрывы",
        "group": "FNS",
        "raw_value": "0",
        "score_delta": 0,
        "max_weight": -100,
        "description": "0 расхождений"
      },
      {
        "factor_name": "Численность сотрудников",
        "group": "FNS",
        "raw_value": "42",
        "score_delta": 60,
        "max_weight": 60,
        "description": "42 чел."
      },
      {
        "factor_name": "Чистая кредитная история",
        "group": "BKI",
        "raw_value": "0 дней просрочки",
        "score_delta": 100,
        "max_weight": 100,
        "description": "Действующие кредиты без просрочек"
      },
      {
        "factor_name": "Среднемесячный оборот",
        "group": "TURNOVER",
        "raw_value": "4983333 ₽",
        "score_delta": 70,
        "max_weight": 100,
        "description": "Хороший оборот"
      },
      {
        "factor_name": "Тренд оборотов (3м vs пред.3м)",
        "group": "TURNOVER",
        "raw_value": "+6%",
        "score_delta": 0,
        "max_weight": 80,
        "description": "Изменение +5.7%"
      },
      {
        "factor_name": "Уникальные контрагенты",
        "group": "TURNOVER",
        "raw_value": "28",
        "score_delta": 25,
        "max_weight": 50,
        "description": "28 контрагентов"
      },
      {
        "factor_name": "Регулярность налоговых платежей",
        "group": "TURNOVER",
        "raw_value": "Регулярно",
        "score_delta": 50,
        "max_weight": 50,
        "description": "Регулярные платежи"
      }
    ]
  },
  "decision_result": {
    "decision": "COUNTER_OFFER",
    "max_monthly_payment": 193750,
    "max_unsecured_limit": 3957060.69,
    "max_secured_limit": 7914121.38,
    "dti_ratio": 0.2408,
    "offers": [
      {
        "variant_index": 1,
        "product_type": "WORKING_CAPITAL_LOAN",
        "approved_amount": 3957060.69,
        "term_months": 24,
        "annual_rate_pct": 16,
        "monthly_payment": 193750,
        "collateral_required": false,
        "collateral_description": null,
        "description": "Сниженная сумма без обеспечения — доступна прямо сейчас"
      },
      {
        "variant_index": 2,
        "product_type": "WORKING_CAPITAL_LOAN",
        "approved_amount": 7914121.38,
        "term_months": 24,
        "annual_rate_pct": 15,
        "monthly_payment": 383729.22,
        "collateral_required": true,
        "collateral_description": "Залог имущества или поручительство Корпорации МСП",
        "description": "Запрошенная сумма под обеспечение / гарантию Корпорации МСП"
      },
      {
        "variant_index": 3,
        "product_type": "REVOLVING_LINE_VKL",
        "approved_amount": 20000000,
        "term_months": 36,
        "annual_rate_pct": 18,
        "monthly_payment": 723047.91,
        "collateral_required": false,
        "collateral_description": null,
        "description": "Альтернативный продукт: REVOLVING_LINE_VKL с увеличенным сроком"
      }
    ],
    "rehabilitation_plan": null,
    "soft_flags": []
  },
  "offers": [
    {
      "variant_index": 1,
      "product_type": "WORKING_CAPITAL_LOAN",
      "approved_amount": 3957060.69,
      "term_months": 24,
      "annual_rate_pct": 16,
      "monthly_payment": 193750,
      "collateral_required": false,
      "collateral_description": null,
      "description": "Сниженная сумма без обеспечения — доступна прямо сейчас"
    },
    {
      "variant_index": 2,
      "product_type": "WORKING_CAPITAL_LOAN",
      "approved_amount": 7914121.38,
      "term_months": 24,
      "annual_rate_pct": 15,
      "monthly_payment": 383729.22,
      "collateral_required": true,
      "collateral_description": "Залог имущества или поручительство Корпорации МСП",
      "description": "Запрошенная сумма под обеспечение / гарантию Корпорации МСП"
    },
    {
      "variant_index": 3,
      "product_type": "REVOLVING_LINE_VKL",
      "approved_amount": 20000000,
      "term_months": 36,
      "annual_rate_pct": 18,
      "monthly_payment": 723047.91,
      "collateral_required": false,
      "collateral_description": null,
      "description": "Альтернативный продукт: REVOLVING_LINE_VKL с увеличенным сроком"
    }
  ],
  "rehabilitation_plan": null,
  "enrichment_snapshots": {
    "egrul": {
      "registration_date": "2016-06-20",
      "authorized_capital": 5000000,
      "okved_main": "",
      "is_liquidating": false,
      "founders": [
        {
          "name": "Иванов И.И.",
          "share_pct": 60
        },
        {
          "name": "Петров П.П.",
          "share_pct": 40
        }
      ]
    },
    "fns": {
      "tax_blocks": [],
      "tax_discrepancies": 0,
      "employee_count": 42
    },
    "bki": {
      "active_loans": 2,
      "total_monthly_payment": 180000,
      "overdue_0": true,
      "overdue_30": false,
      "overdue_60": false,
      "overdue_90_plus": false,
      "credit_history_months": 72
    },
    "alfa_accounts": {
      "monthly_revenue": [
        4200000,
        4500000,
        4100000,
        4800000,
        5000000,
        4700000,
        5200000,
        5500000,
        5100000,
        5300000,
        5600000,
        5800000
      ],
      "avg_balance": 2100000,
      "unique_counterparties": 28,
      "tax_payments_regular": true
    }
  },
  "audit_log": [
    {
      "id": "0920f861-f179-4543-8e29-8740252300fb",
      "application_id": "d1a4aa81-6af6-4b8c-b3f4-002dc12fe8ca",
      "from_state": null,
      "to_state": "DRAFT",
      "trigger": "INIT_PRESET",
      "actor_type": "SYSTEM_CONVEYOR",
      "actor_id": null,
      "details_json": {},
      "created_at": "2026-10-26T10:09:28Z"
    },
    {
      "id": "08d1c74b-54c4-4e0a-bec7-5745d8e02f83",
      "application_id": "d1a4aa81-6af6-4b8c-b3f4-002dc12fe8ca",
      "from_state": "DRAFT",
      "to_state": "SUBMITTED",
      "trigger": "SUBMIT",
      "actor_type": "CLIENT_OWNER",
      "actor_id": null,
      "details_json": {},
      "created_at": "2026-10-26T10:09:28Z"
    },
    {
      "id": "85021f42-4138-4189-b304-1bba42cd791d",
      "application_id": "d1a4aa81-6af6-4b8c-b3f4-002dc12fe8ca",
      "from_state": "SUBMITTED",
      "to_state": "VALIDATION",
      "trigger": "AUTO_VALIDATE",
      "actor_type": "SYSTEM_CONVEYOR",
      "actor_id": null,
      "details_json": {},
      "created_at": "2026-10-26T10:09:28Z"
    },
    {
      "id": "f319f820-8422-446d-b6e4-267f4ba65196",
      "application_id": "d1a4aa81-6af6-4b8c-b3f4-002dc12fe8ca",
      "from_state": "VALIDATION",
      "to_state": "ENRICHMENT",
      "trigger": "VALIDATION_PASSED",
      "actor_type": "SYSTEM_CONVEYOR",
      "actor_id": null,
      "details_json": {},
      "created_at": "2026-10-26T10:09:28Z"
    },
    {
      "id": "002b17c9-83b1-41f5-a2bc-00ce6d12b8ce",
      "application_id": "d1a4aa81-6af6-4b8c-b3f4-002dc12fe8ca",
      "from_state": "ENRICHMENT",
      "to_state": "SCORING_AND_POLICY",
      "trigger": "ENRICHMENT_COMPLETE",
      "actor_type": "SYSTEM_CONVEYOR",
      "actor_id": null,
      "details_json": {},
      "created_at": "2026-10-26T10:09:28Z"
    },
    {
      "id": "cc027da6-a5d7-41a0-b056-239f9980a314",
      "application_id": "d1a4aa81-6af6-4b8c-b3f4-002dc12fe8ca",
      "from_state": "SCORING_AND_POLICY",
      "to_state": "COUNTER_OFFER",
      "trigger": "COUNTER_OFFER_GENERATED",
      "actor_type": "SYSTEM_CONVEYOR",
      "actor_id": null,
      "details_json": {},
      "created_at": "2026-10-26T10:09:28Z"
    }
  ],
  "clarifications": [],
  "documents": [],
  "delegated_to_accountant": false,
  "created_at": "2026-10-26T10:09:28Z",
  "updated_at": "2026-10-26T10:09:28Z"
};

// PRESET: logistics_seasonal
export const preset_logistics_seasonal = {
  "id": "876ed2a6-c6e2-4a86-abeb-69f113c723cb",
  "company_id": "0968c930-d2b6-4499-be82-21c8e946a7fe",
  "company": {
    "id": "0968c930-d2b6-4499-be82-21c8e946a7fe",
    "inn": "5001234567",
    "ogrn": "1185001234567",
    "name": "ООО «ЛогиТранс»",
    "full_name": "Общество с ограниченной ответственностью «ЛогиТранс»",
    "legal_form": "OOO",
    "okved_main": "49.41",
    "okved_description": "Перевозка грузов специализированными автотранспортными средствами",
    "registration_date": "2024-03-15",
    "authorized_capital": 10000,
    "address": "г. Новосибирск, ул. Дуси Ковальчук, 179",
    "employee_count": 7,
    "is_active": true
  },
  "owner_user_id": "4fc27c44-fbde-487d-93d0-e57e544aaa6c",
  "accountant_user_id": "ac523b37-fd85-4cf7-87c3-47257b131f7b",
  "product_type": "REVOLVING_LINE_VKL",
  "requested_amount": 3000000,
  "requested_term_months": 24,
  "gov_program_id": null,
  "state": "MANUAL_REVIEW",
  "scoring_result": {
    "risk_score": 600,
    "pd": 0.073,
    "risk_grade": "C",
    "stop_factors": [],
    "factors_breakdown": [
      {
        "factor_name": "Возраст бизнеса",
        "group": "EGRUL",
        "raw_value": "2.6 лет",
        "score_delta": 0,
        "max_weight": 120,
        "description": "2.6 лет — молодой бизнес"
      },
      {
        "factor_name": "Уставный капитал",
        "group": "EGRUL",
        "raw_value": "10000 ₽",
        "score_delta": -20,
        "max_weight": 40,
        "description": "10000 ₽"
      },
      {
        "factor_name": "Налоговые блокировки",
        "group": "FNS",
        "raw_value": "Нет",
        "score_delta": 0,
        "max_weight": -200,
        "description": "Отсутствуют"
      },
      {
        "factor_name": "Налоговые разрывы",
        "group": "FNS",
        "raw_value": "2",
        "score_delta": -100,
        "max_weight": -100,
        "description": "2 расхождений"
      },
      {
        "factor_name": "Численность сотрудников",
        "group": "FNS",
        "raw_value": "7",
        "score_delta": 30,
        "max_weight": 60,
        "description": "7 чел."
      },
      {
        "factor_name": "Чистая кредитная история",
        "group": "BKI",
        "raw_value": "0 дней просрочки",
        "score_delta": 100,
        "max_weight": 100,
        "description": "Действующие кредиты без просрочек"
      },
      {
        "factor_name": "Среднемесячный оборот",
        "group": "TURNOVER",
        "raw_value": "1250000 ₽",
        "score_delta": 40,
        "max_weight": 100,
        "description": "Средний оборот"
      },
      {
        "factor_name": "Тренд оборотов (3м vs пред.3м)",
        "group": "TURNOVER",
        "raw_value": "+65%",
        "score_delta": 80,
        "max_weight": 80,
        "description": "Изменение +64.5%"
      },
      {
        "factor_name": "Уникальные контрагенты",
        "group": "TURNOVER",
        "raw_value": "8",
        "score_delta": 0,
        "max_weight": 50,
        "description": "8 контрагентов"
      },
      {
        "factor_name": "Регулярность налоговых платежей",
        "group": "TURNOVER",
        "raw_value": "Пропуски",
        "score_delta": -30,
        "max_weight": 50,
        "description": "Нерегулярные платежи"
      }
    ]
  },
  "decision_result": {
    "decision": "MANUAL_REVIEW",
    "max_monthly_payment": 8750,
    "max_unsecured_limit": 165496.85,
    "max_secured_limit": 330993.7,
    "dti_ratio": 0.4533,
    "offers": [],
    "rehabilitation_plan": null,
    "soft_flags": [
      "seasonal_volatility",
      "single_founder",
      "few_counterparties",
      "short_credit_history"
    ]
  },
  "offers": [],
  "rehabilitation_plan": null,
  "enrichment_snapshots": {
    "egrul": {
      "registration_date": "2024-03-15",
      "authorized_capital": 10000,
      "okved_main": "",
      "is_liquidating": false,
      "founders": [
        {
          "name": "Сидоров С.С.",
          "share_pct": 100
        }
      ]
    },
    "fns": {
      "tax_blocks": [],
      "tax_discrepancies": 2,
      "employee_count": 7
    },
    "bki": {
      "active_loans": 1,
      "total_monthly_payment": 85000,
      "overdue_0": true,
      "overdue_30": false,
      "overdue_60": false,
      "overdue_90_plus": false,
      "credit_history_months": 18
    },
    "alfa_accounts": {
      "monthly_revenue": [
        1800000,
        1600000,
        1200000,
        900000,
        700000,
        600000,
        800000,
        1000000,
        1300000,
        1500000,
        1700000,
        1900000
      ],
      "avg_balance": 280000,
      "unique_counterparties": 8,
      "tax_payments_regular": false
    }
  },
  "audit_log": [
    {
      "id": "3aeef1f4-e8b6-4ccd-865a-c309486c45f3",
      "application_id": "876ed2a6-c6e2-4a86-abeb-69f113c723cb",
      "from_state": null,
      "to_state": "DRAFT",
      "trigger": "INIT_PRESET",
      "actor_type": "SYSTEM_CONVEYOR",
      "actor_id": null,
      "details_json": {},
      "created_at": "2026-10-26T10:09:28Z"
    },
    {
      "id": "b3e7fed1-b521-492b-9d9e-ce0b811b1427",
      "application_id": "876ed2a6-c6e2-4a86-abeb-69f113c723cb",
      "from_state": "DRAFT",
      "to_state": "SUBMITTED",
      "trigger": "SUBMIT",
      "actor_type": "CLIENT_OWNER",
      "actor_id": null,
      "details_json": {},
      "created_at": "2026-10-26T10:09:28Z"
    },
    {
      "id": "4fd4b206-7a7e-4d94-90b4-9f490ce680cc",
      "application_id": "876ed2a6-c6e2-4a86-abeb-69f113c723cb",
      "from_state": "SUBMITTED",
      "to_state": "VALIDATION",
      "trigger": "AUTO_VALIDATE",
      "actor_type": "SYSTEM_CONVEYOR",
      "actor_id": null,
      "details_json": {},
      "created_at": "2026-10-26T10:09:28Z"
    },
    {
      "id": "7143a862-403b-4493-8c03-363b695c732c",
      "application_id": "876ed2a6-c6e2-4a86-abeb-69f113c723cb",
      "from_state": "VALIDATION",
      "to_state": "ENRICHMENT",
      "trigger": "VALIDATION_PASSED",
      "actor_type": "SYSTEM_CONVEYOR",
      "actor_id": null,
      "details_json": {},
      "created_at": "2026-10-26T10:09:28Z"
    },
    {
      "id": "8e0a664f-95eb-4d7e-a813-3b44b56c1aac",
      "application_id": "876ed2a6-c6e2-4a86-abeb-69f113c723cb",
      "from_state": "ENRICHMENT",
      "to_state": "SCORING_AND_POLICY",
      "trigger": "ENRICHMENT_COMPLETE",
      "actor_type": "SYSTEM_CONVEYOR",
      "actor_id": null,
      "details_json": {},
      "created_at": "2026-10-26T10:09:28Z"
    },
    {
      "id": "48e5938f-7d6c-48f8-a704-63c70c977470",
      "application_id": "876ed2a6-c6e2-4a86-abeb-69f113c723cb",
      "from_state": "SCORING_AND_POLICY",
      "to_state": "MANUAL_REVIEW",
      "trigger": "NEEDS_MANUAL_REVIEW",
      "actor_type": "SYSTEM_CONVEYOR",
      "actor_id": null,
      "details_json": {},
      "created_at": "2026-10-26T10:09:28Z"
    }
  ],
  "clarifications": [
    {
      "id": "4f56a3bd-12d0-4c1b-99b8-7ba5cb3d51e9",
      "application_id": "876ed2a6-c6e2-4a86-abeb-69f113c723cb",
      "question_text": "Поясните снижение выручки в весенний период и приложите ОСВ за последние 6 месяцев.",
      "required_document_type": "OSV",
      "status": "PENDING",
      "created_at": "2026-10-26T10:09:28Z",
      "response_text": null,
      "document_ids": []
    }
  ],
  "documents": [],
  "delegated_to_accountant": false,
  "created_at": "2026-10-26T10:09:28Z",
  "updated_at": "2026-10-26T10:09:28Z"
};

// PRESET: wholesale_rejected
export const preset_wholesale_rejected = {
  "id": "4426033b-4bc2-470d-a5fc-f0271f29787f",
  "company_id": "2670c2c3-b4ed-40d3-b72e-3ec875ebae4d",
  "company": {
    "id": "2670c2c3-b4ed-40d3-b72e-3ec875ebae4d",
    "inn": "7725987654",
    "ogrn": "1207700987654",
    "name": "ООО «ОптТрейд»",
    "full_name": "Общество с ограниченной ответственностью «ОптТрейд»",
    "legal_form": "OOO",
    "okved_main": "46.73",
    "okved_description": "Торговля оптовая лесоматериалами, строительными материалами",
    "registration_date": "2020-11-05",
    "authorized_capital": 10000,
    "address": "г. Самара, ул. Советской Армии, 200",
    "employee_count": 3,
    "is_active": true
  },
  "owner_user_id": "df6cbd56-3b53-40d9-ad64-3794222220e2",
  "accountant_user_id": "c4d1bf8d-cecb-4ac3-86f1-41701884081d",
  "product_type": "WORKING_CAPITAL_LOAN",
  "requested_amount": 10000000,
  "requested_term_months": 18,
  "gov_program_id": null,
  "state": "REJECTED",
  "scoring_result": {
    "risk_score": 0,
    "pd": 0.99,
    "risk_grade": "E",
    "stop_factors": [
      "Налоговая блокировка счёта ФНС",
      "Просрочка 90+ дней в кредитной истории"
    ],
    "factors_breakdown": [
      {
        "factor_name": "Возраст бизнеса",
        "group": "EGRUL",
        "raw_value": "6.0 лет",
        "score_delta": 90,
        "max_weight": 120,
        "description": "6.0 лет — зрелый бизнес"
      },
      {
        "factor_name": "Уставный капитал",
        "group": "EGRUL",
        "raw_value": "10000 ₽",
        "score_delta": -20,
        "max_weight": 40,
        "description": "10000 ₽"
      },
      {
        "factor_name": "Налоговые блокировки",
        "group": "FNS",
        "raw_value": "1 блокировок",
        "score_delta": -200,
        "max_weight": -200,
        "description": "Активная блокировка счёта"
      },
      {
        "factor_name": "Налоговые разрывы",
        "group": "FNS",
        "raw_value": "3",
        "score_delta": -100,
        "max_weight": -100,
        "description": "3 расхождений"
      },
      {
        "factor_name": "Численность сотрудников",
        "group": "FNS",
        "raw_value": "3",
        "score_delta": 0,
        "max_weight": 60,
        "description": "3 чел."
      },
      {
        "factor_name": "Просрочка 90+ дней",
        "group": "BKI",
        "raw_value": "Да",
        "score_delta": -200,
        "max_weight": -200,
        "description": "Критическая просрочка"
      },
      {
        "factor_name": "Просрочка 60 дней",
        "group": "BKI",
        "raw_value": "Да",
        "score_delta": -120,
        "max_weight": -120,
        "description": "Существенная просрочка"
      },
      {
        "factor_name": "Просрочка 30 дней",
        "group": "BKI",
        "raw_value": "Да",
        "score_delta": -60,
        "max_weight": -60,
        "description": "Незначительная просрочка"
      },
      {
        "factor_name": "Среднемесячный оборот",
        "group": "TURNOVER",
        "raw_value": "419167 ₽",
        "score_delta": 0,
        "max_weight": 100,
        "description": "Низкий оборот"
      },
      {
        "factor_name": "Тренд оборотов (3м vs пред.3м)",
        "group": "TURNOVER",
        "raw_value": "-35%",
        "score_delta": -80,
        "max_weight": 80,
        "description": "Изменение -35.5%"
      },
      {
        "factor_name": "Уникальные контрагенты",
        "group": "TURNOVER",
        "raw_value": "4",
        "score_delta": 0,
        "max_weight": 50,
        "description": "4 контрагентов"
      },
      {
        "factor_name": "Регулярность налоговых платежей",
        "group": "TURNOVER",
        "raw_value": "Пропуски",
        "score_delta": -30,
        "max_weight": 50,
        "description": "Нерегулярные платежи"
      }
    ]
  },
  "decision_result": {
    "decision": "REJECTED",
    "max_monthly_payment": 0,
    "max_unsecured_limit": 0,
    "max_secured_limit": 0,
    "dti_ratio": 5.0895,
    "offers": [],
    "rehabilitation_plan": {
      "duration_days": 30,
      "rejection_reasons": [
        "Налоговая блокировка счёта ФНС",
        "Просрочка 90+ дней в кредитной истории"
      ],
      "action_items": [
        {
          "action": "Погасить налоговую задолженность и снять блокировку счёта ФНС",
          "deadline_days": 14,
          "priority": "HIGH"
        },
        {
          "action": "Погасить просрочку и дождаться обновления данных в БКИ",
          "deadline_days": 30,
          "priority": "HIGH"
        }
      ],
      "estimated_grade_after": "C",
      "reapply_eligible_date": "2026-11-25"
    },
    "soft_flags": [
      "seasonal_volatility",
      "single_founder",
      "few_counterparties"
    ]
  },
  "offers": [],
  "rehabilitation_plan": {
    "duration_days": 30,
    "rejection_reasons": [
      "Налоговая блокировка счёта ФНС",
      "Просрочка 90+ дней в кредитной истории"
    ],
    "action_items": [
      {
        "action": "Погасить налоговую задолженность и снять блокировку счёта ФНС",
        "deadline_days": 14,
        "priority": "HIGH"
      },
      {
        "action": "Погасить просрочку и дождаться обновления данных в БКИ",
        "deadline_days": 30,
        "priority": "HIGH"
      }
    ],
    "estimated_grade_after": "C",
    "reapply_eligible_date": "2026-11-25"
  },
  "enrichment_snapshots": {
    "egrul": {
      "registration_date": "2020-11-05",
      "authorized_capital": 10000,
      "okved_main": "",
      "is_liquidating": false,
      "founders": [
        {
          "name": "Козлов К.К.",
          "share_pct": 100
        }
      ]
    },
    "fns": {
      "tax_blocks": [
        {
          "date": "2026-08-15",
          "reason": "Непредставление декларации",
          "type": "ACCOUNT_BLOCK"
        }
      ],
      "tax_discrepancies": 3,
      "employee_count": 3
    },
    "bki": {
      "active_loans": 3,
      "total_monthly_payment": 320000,
      "overdue_0": false,
      "overdue_30": true,
      "overdue_60": true,
      "overdue_90_plus": true,
      "credit_history_months": 36
    },
    "alfa_accounts": {
      "monthly_revenue": [
        800000,
        750000,
        600000,
        500000,
        450000,
        400000,
        350000,
        300000,
        280000,
        250000,
        200000,
        150000
      ],
      "avg_balance": 45000,
      "unique_counterparties": 4,
      "tax_payments_regular": false
    }
  },
  "audit_log": [
    {
      "id": "aba1660d-8857-42d1-a7d9-3be74c12d215",
      "application_id": "4426033b-4bc2-470d-a5fc-f0271f29787f",
      "from_state": null,
      "to_state": "DRAFT",
      "trigger": "INIT_PRESET",
      "actor_type": "SYSTEM_CONVEYOR",
      "actor_id": null,
      "details_json": {},
      "created_at": "2026-10-26T10:09:28Z"
    },
    {
      "id": "9c41192a-fedd-4ba1-928c-b0834d50528f",
      "application_id": "4426033b-4bc2-470d-a5fc-f0271f29787f",
      "from_state": "DRAFT",
      "to_state": "SUBMITTED",
      "trigger": "SUBMIT",
      "actor_type": "CLIENT_OWNER",
      "actor_id": null,
      "details_json": {},
      "created_at": "2026-10-26T10:09:28Z"
    },
    {
      "id": "62898e87-899d-4c3e-b4a7-64435c236df8",
      "application_id": "4426033b-4bc2-470d-a5fc-f0271f29787f",
      "from_state": "SUBMITTED",
      "to_state": "VALIDATION",
      "trigger": "AUTO_VALIDATE",
      "actor_type": "SYSTEM_CONVEYOR",
      "actor_id": null,
      "details_json": {},
      "created_at": "2026-10-26T10:09:28Z"
    },
    {
      "id": "e7eb5096-5924-45f8-a900-8540c59195bb",
      "application_id": "4426033b-4bc2-470d-a5fc-f0271f29787f",
      "from_state": "VALIDATION",
      "to_state": "ENRICHMENT",
      "trigger": "VALIDATION_PASSED",
      "actor_type": "SYSTEM_CONVEYOR",
      "actor_id": null,
      "details_json": {},
      "created_at": "2026-10-26T10:09:28Z"
    },
    {
      "id": "22efbb95-c00c-46a5-82ac-40933aa1a879",
      "application_id": "4426033b-4bc2-470d-a5fc-f0271f29787f",
      "from_state": "ENRICHMENT",
      "to_state": "SCORING_AND_POLICY",
      "trigger": "ENRICHMENT_COMPLETE",
      "actor_type": "SYSTEM_CONVEYOR",
      "actor_id": null,
      "details_json": {},
      "created_at": "2026-10-26T10:09:28Z"
    },
    {
      "id": "023078cb-93e3-4ccb-a816-97be296caedd",
      "application_id": "4426033b-4bc2-470d-a5fc-f0271f29787f",
      "from_state": "SCORING_AND_POLICY",
      "to_state": "REJECTED",
      "trigger": "AUTO_REJECT",
      "actor_type": "SYSTEM_CONVEYOR",
      "actor_id": null,
      "details_json": {},
      "created_at": "2026-10-26T10:09:28Z"
    }
  ],
  "clarifications": [],
  "documents": [],
  "delegated_to_accountant": false,
  "created_at": "2026-10-26T10:09:28Z",
  "updated_at": "2026-10-26T10:09:28Z"
};

// PRESET: custom_input
export const preset_custom_input = {
  "id": "6529bd04-cf44-411c-a373-943eef177fbb",
  "company_id": "f183c746-744f-4b58-a260-90235311d1bd",
  "company": {
    "id": "f183c746-744f-4b58-a260-90235311d1bd",
    "inn": "",
    "ogrn": "",
    "name": "Новая компания (ручной ввод)",
    "full_name": "Новая компания (ручной ввод)",
    "legal_form": "OOO",
    "okved_main": "46.90",
    "okved_description": "Торговля оптовая неспециализированная",
    "registration_date": "2026-10-26",
    "authorized_capital": 10000,
    "address": "г. Москва",
    "employee_count": 1,
    "is_active": true
  },
  "owner_user_id": "78ae3a8b-922e-4b86-971c-9770a6e80d1f",
  "accountant_user_id": "c18f80b0-532a-4c44-bf4b-d12f3654c5e7",
  "product_type": "WORKING_CAPITAL_LOAN",
  "requested_amount": 1000000,
  "requested_term_months": 12,
  "gov_program_id": null,
  "state": "DRAFT",
  "scoring_result": null,
  "decision_result": null,
  "offers": [],
  "rehabilitation_plan": null,
  "enrichment_snapshots": null,
  "audit_log": [
    {
      "id": "ca5164b3-b8da-46f6-8093-455a96c01636",
      "application_id": "6529bd04-cf44-411c-a373-943eef177fbb",
      "from_state": null,
      "to_state": "DRAFT",
      "trigger": "INIT_PRESET",
      "actor_type": "SYSTEM_CONVEYOR",
      "actor_id": null,
      "details_json": {
        "preset_id": "custom_input"
      },
      "created_at": "2026-10-26T10:09:28Z"
    }
  ],
  "clarifications": [],
  "documents": [],
  "delegated_to_accountant": false,
  "created_at": "2026-10-26T10:09:28Z",
  "updated_at": "2026-10-26T10:09:28Z"
};


export const GovSupportNews = [
  {
    id: "news_1",
    title: "Льготный кредит для общепита до 13.5% (Программа 1764)",
    body: "Субсидирование процентной ставки для предприятий общественного питания по программе Минэкономразвития 1764.",
    program_type: "SUBSIDIZED_RATE",
    max_rate_pct: 13.5,
    applicable_to_products: ["WORKING_CAPITAL_LOAN", "OVERDRAFT"],
    okved_prefixes: ["56"]
  },
  {
    id: "news_2",
    title: "Грант до 500К на открытие точки общепита",
    body: "Безвозвратная субсидия на аренду, ремонт и оборудование для новых точек общественного питания.",
    program_type: "GRANT",
    applicable_to_products: ["ALL"],
    okved_prefixes: ["56"]
  },
  {
    id: "news_3",
    title: "Льготное кредитование производств до 9%",
    body: "Субсидированная ставка для обрабатывающих производств в рамках национального проекта.",
    program_type: "SUBSIDIZED_RATE",
    max_rate_pct: 9.0,
    applicable_to_products: ["INVESTMENT_LOAN", "WORKING_CAPITAL_LOAN"],
    okved_prefixes: ["25", "28", "29"]
  },
  {
    id: "news_4",
    title: "Гарантия Корпорации МСП до 70%",
    body: "Зонтичная гарантия для производственных предприятий при получении кредита.",
    program_type: "GUARANTEE_MSP",
    guarantee_pct: 70.0,
    applicable_to_products: ["INVESTMENT_LOAN", "WORKING_CAPITAL_LOAN"],
    okved_prefixes: ["25", "28", "29"]
  },
  {
    id: "news_5",
    title: "Субсидированная ставка для логистики 12%",
    body: "Льготное кредитование для транспортно-логистических компаний.",
    program_type: "SUBSIDIZED_RATE",
    max_rate_pct: 12.0,
    applicable_to_products: ["WORKING_CAPITAL_LOAN", "REVOLVING_LINE_VKL"],
    okved_prefixes: ["49", "52"]
  },
  {
    id: "news_6",
    title: "Инвестиционный вычет на обновление автопарка",
    body: "Налоговый инвестиционный вычет на приобретение транспортных средств для бизнеса.",
    program_type: "TAX_BENEFIT",
    applicable_to_products: ["INVESTMENT_LOAN"],
    okved_prefixes: ["49", "52"]
  },
  {
    id: "news_7",
    title: "Зонтичная гарантия для оптовой торговли до 50%",
    body: "Гарантия Корпорации МСП для предприятий оптовой торговли.",
    program_type: "GUARANTEE_MSP",
    guarantee_pct: 50.0,
    applicable_to_products: ["WORKING_CAPITAL_LOAN", "REVOLVING_LINE_VKL"],
    okved_prefixes: ["46"]
  },
  {
    id: "news_8",
    title: "Программа «Дальневосточная ипотека для бизнеса» до 10%",
    body: "Льготное кредитование для бизнеса на территории Дальнего Востока.",
    program_type: "SUBSIDIZED_RATE",
    max_rate_pct: 10.0,
    applicable_to_products: ["INVESTMENT_LOAN", "WORKING_CAPITAL_LOAN"],
    okved_prefixes: ["ALL"]
  }
];

export function aiFallbackAnswer(message: string) {
  const msg = (message || '').toLowerCase();
  const rules = [
    {
      keywords: ["овердрафт", "overdraft"],
      response: "Овердрафт — краткосрочный кредитный лимит на расчётном счёте. Доступен от 50 тыс. до 3 млн ₽ на срок 3–12 месяцев. Ставка от 18% годовых. Рекомендуется для покрытия кассовых разрывов.",
      suggestions: ["Сколько нужна сумма?", "Какой срок?", "Есть ли залог?"]
    },
    {
      keywords: ["оборотный", "working capital"],
      response: "Оборотный кредит подходит для пополнения оборотных средств: закупка товаров, сырья, расходных материалов. Сумма от 500 тыс. до 30 млн ₽, срок 6–36 мес., ставка от 16%.",
      suggestions: ["Какой оборот за месяц?", "На что нужны средства?"]
    },
    {
      keywords: ["инвестиц", "investment"],
      response: "Инвестиционный кредит — для капитальных вложений: покупка оборудования, недвижимости, модернизация. Сумма до 50 млн ₽, срок до 5 лет, ставка от 14%.",
      suggestions: ["Что планируете приобрести?", "Какая стоимость актива?"]
    },
    {
      keywords: ["скоринг", "рейтинг", "оценка", "балл"],
      response: "Скоринговая оценка рассчитывается на основе: возраста бизнеса, оборотов по счёту, кредитной истории, данных ФНС и ЕГРЮЛ. Базовый балл 500, максимум 1000. Grade A (800+) — лучшие условия.",
      suggestions: ["Какой у меня скоринг?", "Как улучшить рейтинг?"]
    },
    {
      keywords: ["отказ", "rejected", "отклон"],
      response: "Отказ может быть связан со стоп-факторами: налоговые блокировки ФНС, просрочки 90+ дней в БКИ, ликвидация компании. Устраните стоп-факторы и подайте повторно.",
      suggestions: ["Как устранить блокировку?", "Когда можно подать повторно?"]
    },
    {
      keywords: ["господдержка", "льгот", "субсид", "программ"],
      response: "Доступны программы господдержки: льготные ставки (от 9%), гарантии Корпорации МСП до 70%, гранты для отдельных отраслей. Подберём по вашему ОКВЭД.",
      suggestions: ["Покажи программы для моей отрасли", "Как применить программу?"]
    },
    {
      keywords: ["залог", "обеспечение", "collateral"],
      response: "Залог требуется при сумме более 3–5 млн ₽ в зависимости от продукта. Принимается недвижимость, оборудование, поручительство Корпорации МСП.",
      suggestions: ["Какой залог подходит?", "Можно без залога?"]
    },
    {
      keywords: ["документ", "справка", "осв", "баланс"],
      response: "Для заявки обычно нужны: ОСВ (оборотно-сальдовая ведомость), бухгалтерский баланс, налоговая декларация. Загрузите документы в разделе «Документы» заявки.",
      suggestions: ["Какие форматы принимаются?", "Загрузить документы"]
    },
    {
      keywords: ["ставк", "процент", "rate"],
      response: "Процентная ставка зависит от кредитного рейтинга: Grade A — от 14%, Grade B — от 17%, Grade C — от 21%. При господдержке ставка снижается дополнительно.",
      suggestions: ["Мой рейтинг?", "Есть льготные программы?"]
    }
  ];

  for (const r of rules) {
    if (r.keywords.some((kw) => msg.includes(kw))) {
      return { response: r.response, source: "fallback", suggestions: r.suggestions };
    }
  }

  return {
    response: "Я помогу подобрать оптимальный кредитный продукт для вашего бизнеса. Расскажите, какая сумма нужна, на какой срок и для каких целей?",
    source: "fallback",
    suggestions: ["Оборотный кредит", "Овердрафт", "Инвестиционный кредит", "Программы господдержки"]
  };
}
