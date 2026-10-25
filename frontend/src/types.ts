// ─── Domain Types ────────────────────────────────────────────────────────────

export type AppState =
  | 'DRAFT' | 'SUBMITTED' | 'VALIDATION' | 'ENRICHMENT'
  | 'SCORING_AND_POLICY' | 'APPROVED' | 'COUNTER_OFFER'
  | 'MANUAL_REVIEW' | 'NEED_CLARIFICATION' | 'RESUBMITTED'
  | 'REJECTED' | 'OFFER_ACCEPTED' | 'CONTRACT_SIGNED' | 'FUNDED' | 'CANCELLED';

export type RiskGrade = 'A' | 'B' | 'C' | 'D' | 'E';

export type ProductType =
  | 'OVERDRAFT' | 'WORKING_CAPITAL_LOAN' | 'REVOLVING_LINE_VKL' | 'INVESTMENT_LOAN';

export type UserRole = 'OWNER' | 'ACCOUNTANT';

export interface Preset {
  preset_id: string;
  label: string;
  expected_outcome: string;
  company_name: string;
  inn: string | null;
  description: string;
}

export interface ScoringFactor {
  factor_name: string;
  group: string;
  raw_value: string | number;
  score_delta: number;
  max_weight: number;
  description: string;
}

export interface ScoringResult {
  risk_score: number;
  pd: number;
  risk_grade: RiskGrade;
  stop_factors: string[];
  factors_breakdown: ScoringFactor[];
}

export interface CreditOffer {
  variant_index: number;
  product_type: string;
  approved_amount: number;
  term_months: number;
  annual_rate_pct: number;
  monthly_payment: number;
  collateral_required: boolean;
  collateral_description: string | null;
  description: string;
}

export interface RehabStep {
  reason?: string;
  action: string;
  deadline_days: number;
  priority?: string;
}

export interface RehabilitationPlan {
  steps?: RehabStep[];
  action_items?: RehabStep[];
  total_days?: number;
  duration_days?: number;
  rejection_reasons?: string[];
  estimated_grade_after?: string;
  reapply_eligible_date?: string;
}

export interface DecisionResult {
  decision: string;
  max_monthly_payment: number;
  max_unsecured_limit: number;
  max_secured_limit: number;
  dti_ratio: number;
  offers: CreditOffer[];
  rehabilitation_plan: RehabilitationPlan | null;
  soft_flags?: string[];
}

export interface AuditLogEntry {
  id: string;
  application_id: string;
  from_state: string | null;
  to_state: string;
  trigger: string;
  actor_type: string;
  actor_id: string | null;
  details_json: Record<string, unknown>;
  created_at: string;
}

export interface Clarification {
  id: string;
  application_id: string;
  question_text: string;
  required_document_type: string;
  status: 'PENDING' | 'RESPONDED';
  created_at: string;
  response_text: string | null;
  document_ids: string[];
}

export interface DocumentEntry {
  document_id: string;
  filename: string;
  doc_type: string;
  uploaded_by: string;
  url: string;
  size_bytes: number;
  created_at: string;
}

export interface Company {
  id: string;
  inn: string;
  ogrn: string;
  name: string;
  full_name: string;
  legal_form: string;
  okved_main: string;
  okved_description: string;
  registration_date: string;
  authorized_capital: number | null;
  address: string;
  employee_count: number;
  is_active: boolean;
}

export interface EnrichmentSnapshots {
  egrul: {
    registration_date: string;
    authorized_capital: number | null;
    is_liquidating: boolean;
    founders?: { name: string; share_pct: number }[];
    okved_main?: string;
  };
  fns: {
    tax_blocks: { type: string; reason: string; date: string }[];
    tax_discrepancies: number;
    employee_count: number;
  };
  bki: {
    active_loans: number;
    total_monthly_payment: number;
    overdue_0: boolean;
    overdue_30: boolean;
    overdue_60: boolean;
    overdue_90_plus: boolean;
    credit_history_months?: number;
  };
  alfa_accounts: {
    monthly_revenue: number[];
    avg_balance: number;
    unique_counterparties: number;
    tax_payments_regular: boolean;
  };
}

export interface Application {
  id: string;
  company_id: string;
  company: Company;
  owner_user_id: string;
  accountant_user_id: string;
  product_type: ProductType;
  requested_amount: number;
  requested_term_months: number;
  gov_program_id: string | null;
  gov_program_title?: string;
  state: AppState;
  scoring_result: ScoringResult | null;
  decision_result: DecisionResult | null;
  offers: CreditOffer[];
  rehabilitation_plan: RehabilitationPlan | null;
  enrichment_snapshots: EnrichmentSnapshots | null;
  audit_log: AuditLogEntry[];
  clarifications: Clarification[];
  documents: DocumentEntry[];
  created_at: string;
  updated_at: string;
  delegated_to_accountant?: boolean;
  selected_offer_variant?: number;
}

export interface NewsItem {
  id: string;
  title: string;
  body: string;
  program_type: string;
  max_rate_pct?: number;
  guarantee_pct?: number;
  applicable_to_products: string[];
}

export interface AiResponse {
  response: string;
  source: 'ollama' | 'fallback';
  suggestions: string[];
  context_hint?: string;
  amount?: number;
  term?: number;
  product?: ProductType;
}

export interface UnderwriterQueueItem {
  id: string;
  company_name: string;
  inn: string;
  product_type: string;
  requested_amount: number;
  risk_grade: RiskGrade;
  risk_score: number;
  state: AppState;
  soft_flags: string[];
  created_at: string;
}
