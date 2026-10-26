import {
  preset_coffee_shop_ip,
  preset_manufacturing_ooo,
  preset_logistics_seasonal,
  preset_wholesale_rejected,
  preset_custom_input,
  GovSupportNews,
  aiFallbackAnswer,
} from './mockData';

const presetsMap: Record<string, any> = {
  coffee_shop_ip: preset_coffee_shop_ip,
  manufacturing_ooo: preset_manufacturing_ooo,
  logistics_seasonal: preset_logistics_seasonal,
  wholesale_rejected: preset_wholesale_rejected,
  custom_input: preset_custom_input,
};

let activePresetId = 'coffee_shop_ip';
let currentApplication: any = JSON.parse(JSON.stringify(preset_coffee_shop_ip));

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export async function handleMockRequest(config: any): Promise<any> {
  const method = (config.method || 'GET').toUpperCase();
  let url = (config.url || '').replace(/^\/api/, '');
  if (url.startsWith('/')) url = url.slice(1);
  const [pathname, search] = url.split('?');
  const params = new URLSearchParams(search || '');

  let body: any = {};
  if (config.data) {
    if (typeof config.data === 'string') {
      try {
        body = JSON.parse(config.data);
      } catch {
        body = {};
      }
    } else {
      body = config.data;
    }
  }

  // 1. Presets list
  if (pathname === 'presets') {
    return {
      status: 200,
      data: {
        presets: [
          {
            preset_id: 'coffee_shop_ip',
            label: '☕ ИП Кофеева — Авто-одобрение овердрафта',
            expected_outcome: 'APPROVED',
            company_name: 'ИП Кофеева Анна Михайловна',
            inn: '771234567890',
            description: 'Ожидаемый исход: APPROVED',
          },
          {
            preset_id: 'manufacturing_ooo',
            label: '🏭 ООО ТехноСтрой — Counter-Offer (3 альтернативы)',
            expected_outcome: 'COUNTER_OFFER',
            company_name: 'ООО «ТехноСтрой Инновации»',
            inn: '7702123456',
            description: 'Ожидаемый исход: COUNTER_OFFER',
          },
          {
            preset_id: 'logistics_seasonal',
            label: '🚛 ООО ЛогиТранс — Ручной разбор + уточнение',
            expected_outcome: 'MANUAL_REVIEW',
            company_name: 'ООО «ЛогиТранс»',
            inn: '5001234567',
            description: 'Ожидаемый исход: MANUAL_REVIEW',
          },
          {
            preset_id: 'wholesale_rejected',
            label: '⛔ ООО ОптТрейд — Отказ + План реабилитации',
            expected_outcome: 'REJECTED',
            company_name: 'ООО «ОптТрейд»',
            inn: '7725987654',
            description: 'Ожидаемый исход: REJECTED',
          },
          {
            preset_id: 'custom_input',
            label: '✏️ Свой ввод — заполните форму вручную',
            expected_outcome: 'DEPENDS_ON_INPUT',
            company_name: 'Свой ввод',
            inn: null,
            description: 'Ожидаемый исход: DEPENDS_ON_INPUT',
          },
        ],
        active_preset_id: activePresetId,
      },
    };
  }

  // 2. Load preset
  if (pathname.startsWith('presets/') && pathname.endsWith('/load')) {
    const presetId = pathname.replace('presets/', '').replace('/load', '');
    activePresetId = presetId;
    const base = presetsMap[presetId] || preset_coffee_shop_ip;
    currentApplication = deepClone(base);
    currentApplication.id = currentApplication.id || `app-${presetId}-${Date.now()}`;
    return {
      status: 200,
      data: {
        preset_id: presetId,
        application_id: currentApplication.id,
        current_state: currentApplication.state,
      },
    };
  }

  // 3. Application by ID
  if (pathname.startsWith('applications/')) {
    const sub = pathname.replace('applications/', '');
    const parts = sub.split('/');
    const action = parts[1];

    if (!action) {
      if (method === 'GET') {
        return {
          status: 200,
          data: currentApplication,
        };
      }
      if (method === 'PATCH') {
        if (body.requested_amount !== undefined) currentApplication.requested_amount = body.requested_amount;
        if (body.requested_term_months !== undefined) currentApplication.requested_term_months = body.requested_term_months;
        if (body.product_type !== undefined) currentApplication.product_type = body.product_type;
        currentApplication.updated_at = new Date().toISOString();
        return {
          status: 200,
          data: { application: currentApplication },
        };
      }
    }

    if (action === 'transition') {
      const trigger = body.trigger || body.transition;
      if (trigger === 'SEND_TO_BANK' || trigger === 'SUBMIT') {
        currentApplication.state = 'APPROVED';
        if (!currentApplication.offers || currentApplication.offers.length === 0) {
          currentApplication.offers = [
            {
              variant_id: 1,
              product_type: currentApplication.product_type || 'OVERDRAFT',
              amount: currentApplication.requested_amount || 500000,
              term_months: currentApplication.requested_term_months || 12,
              interest_rate: 14.5,
              monthly_payment: Math.round(((currentApplication.requested_amount || 500000) * 1.145) / 12),
              total_repayment: Math.round((currentApplication.requested_amount || 500000) * 1.145),
              collateral_required: false,
              is_recommended: true,
              badge: 'Выбор банка',
              description: 'Экспресс-одобрение без залога',
            },
          ];
        }
      } else if (trigger === 'DISBURSE') {
        currentApplication.state = 'FUNDED';
        currentApplication.disbursed_at = new Date().toISOString();
      }
      return {
        status: 200,
        data: currentApplication,
      };
    }

    if (action === 'sign') {
      const otp = body.otp_code || '';
      if (otp !== '1234') {
        const err: any = new Error('Неверный OTP-код. Используйте 1234 для тестового стенда.');
        err.response = {
          status: 400,
          data: { detail: 'Неверный OTP-код. Введите 1234 для тестового подписания.' },
        };
        throw err;
      }
      currentApplication.state = 'CONTRACT_SIGNED';
      currentApplication.signed_at = new Date().toISOString();
      currentApplication.audit_log = currentApplication.audit_log || [];
      currentApplication.audit_log.push({
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        from_state: 'APPROVED',
        to_state: 'CONTRACT_SIGNED',
        trigger: 'SIGN_CONTRACT',
        actor_type: 'CLIENT_OWNER',
        description: 'Договор успешно подписан ПЭП (СМС-код 1234)',
      });
      return {
        status: 200,
        data: {
          success: true,
          application: currentApplication,
          state: 'CONTRACT_SIGNED',
          signed_at: currentApplication.signed_at,
        },
      };
    }

    if (action === 'disburse') {
      currentApplication.state = 'FUNDED';
      currentApplication.disbursed_at = new Date().toISOString();
      currentApplication.audit_log = currentApplication.audit_log || [];
      currentApplication.audit_log.push({
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        from_state: 'CONTRACT_SIGNED',
        to_state: 'FUNDED',
        trigger: 'DISBURSE',
        actor_type: 'SYSTEM_CONVEYOR',
        description: 'Кредитные средства зачислены на счёт заёмщика',
      });
      return {
        status: 200,
        data: {
          success: true,
          application: currentApplication,
          state: 'FUNDED',
          disbursed_at: currentApplication.disbursed_at,
        },
      };
    }

    if (action === 'delegate') {
      currentApplication.delegated_to_accountant = true;
      currentApplication.audit_log = currentApplication.audit_log || [];
      currentApplication.audit_log.push({
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        from_state: currentApplication.state,
        to_state: currentApplication.state,
        trigger: 'DELEGATE_TO_ACCOUNTANT',
        actor_type: 'CLIENT_OWNER',
        description: 'Полномочия прикрепления документов делегированы главному бухгалтеру',
      });
      return {
        status: 200,
        data: {
          success: true,
          application: currentApplication,
        },
      };
    }

    if (action === 'documents') {
      const docId = `doc-${Date.now()}`;
      currentApplication.documents = currentApplication.documents || [];
      currentApplication.documents.push({
        document_id: docId,
        filename: 'osv_schet_51_2025.xlsx',
        doc_type: 'OSV_51',
        uploaded_by: currentApplication.delegated_to_accountant ? 'CLIENT_ACCOUNTANT' : 'CLIENT_OWNER',
        url: '/uploads/osv_schet_51_2025.xlsx',
        size_bytes: 184500,
        created_at: new Date().toISOString(),
      });
      return {
        status: 200,
        data: {
          document_id: docId,
          filename: 'osv_schet_51_2025.xlsx',
          status: 'UPLOADED',
        },
      };
    }

    if (action === 'apply-program') {
      const newsId = body.news_item_id;
      currentApplication.gov_program_id = newsId;
      const found = GovSupportNews.find((n: any) => n.id === newsId);
      if (found) {
        currentApplication.gov_program_title = found.title;
        if (found.max_rate_pct && currentApplication.offers && currentApplication.offers.length > 0) {
          currentApplication.offers[0].interest_rate = found.max_rate_pct;
          currentApplication.offers[0].badge = 'Субсидия ОКВЭД';
        }
      }
      return {
        status: 200,
        data: {
          success: true,
          application: currentApplication,
        },
      };
    }
  }

  // 4. Create application
  if (pathname === 'applications' && method === 'POST') {
    const newApp = deepClone(preset_custom_input);
    newApp.id = `app-custom-${Date.now()}`;
    newApp.requested_amount = body.requested_amount || 1000000;
    newApp.requested_term_months = body.requested_term_months || 12;
    newApp.product_type = body.product_type || 'WORKING_CAPITAL_LOAN';
    if (body.company) {
      newApp.company = { ...newApp.company, ...body.company };
    }
    currentApplication = newApp;
    return {
      status: 201,
      data: currentApplication,
    };
  }

  // 5. Underwriter decisions
  if (pathname.includes('/decide')) {
    const decision = body.decision;
    if (decision === 'APPROVE') {
      currentApplication.state = 'APPROVED';
    } else if (decision === 'COUNTER_OFFER') {
      currentApplication.state = 'COUNTER_OFFER';
    } else if (decision === 'REQUEST_DOCUMENTS') {
      currentApplication.state = 'NEED_CLARIFICATION';
      currentApplication.clarifications = currentApplication.clarifications || [];
      currentApplication.clarifications.push({
        id: `clar-${Date.now()}`,
        request_text: body.comment || 'Предоставьте расшифровку выручки и ОСВ по 51 счету за последний квартал.',
        status: 'PENDING',
        created_at: new Date().toISOString(),
        document_ids: [],
      });
    } else if (decision === 'REJECT') {
      currentApplication.state = 'REJECTED';
    }
    return {
      status: 200,
      data: {
        success: true,
        application: currentApplication,
      },
    };
  }

  // 6. Clarifications respond
  if (pathname.startsWith('clarifications/') && pathname.endsWith('/respond')) {
    if (currentApplication.clarifications && currentApplication.clarifications.length > 0) {
      currentApplication.clarifications[0].status = 'RESPONDED';
      currentApplication.clarifications[0].response_text = body.response_text || 'Пояснения и документы прикреплены.';
    }
    currentApplication.state = 'MANUAL_REVIEW';
    return {
      status: 200,
      data: { success: true },
    };
  }

  // 7. News / Gov support
  if (pathname === 'news') {
    const prefix = params.get('okved_prefix') || '';
    const filtered = GovSupportNews.filter(
      (n: any) => n.okved_prefixes.includes('ALL') || (prefix && n.okved_prefixes.some((p: string) => prefix.startsWith(p) || p.startsWith(prefix)))
    );
    return {
      status: 200,
      data: {
        items: filtered.length > 0 ? filtered : GovSupportNews,
      },
    };
  }

  // 8. AI recommend
  if (pathname === 'ai/recommend') {
    const ans = aiFallbackAnswer(body.message || '');
    return {
      status: 200,
      data: ans,
    };
  }

  // Fallback
  return {
    status: 200,
    data: currentApplication || {},
  };
}
