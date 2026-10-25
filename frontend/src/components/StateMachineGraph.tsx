import type { AppState } from '../types';
import { STATE_LABELS } from '../utils';

interface Props {
  currentState: AppState;
}

// Simplified FSM graph for visualization
const NODES: { state: AppState; x: number; y: number; terminal?: boolean }[] = [
  { state: 'DRAFT',              x: 50,  y: 20 },
  { state: 'SUBMITTED',         x: 50,  y: 70 },
  { state: 'VALIDATION',        x: 50,  y: 120 },
  { state: 'ENRICHMENT',        x: 50,  y: 170 },
  { state: 'SCORING_AND_POLICY',x: 50,  y: 220 },
  { state: 'APPROVED',          x: 10,  y: 290 },
  { state: 'COUNTER_OFFER',     x: 80,  y: 290 },
  { state: 'MANUAL_REVIEW',     x: 150, y: 220 },
  { state: 'NEED_CLARIFICATION',x: 150, y: 290 },
  { state: 'REJECTED',          x: 220, y: 290 },
  { state: 'RESUBMITTED',       x: 150, y: 170 },
  { state: 'OFFER_ACCEPTED',    x: 45,  y: 360 },
  { state: 'CONTRACT_SIGNED',   x: 45,  y: 420 },
  { state: 'FUNDED',            x: 45,  y: 480, terminal: true },
  { state: 'CANCELLED',         x: 150, y: 360, terminal: true },
];

const EDGES: [AppState, AppState, string][] = [
  ['DRAFT', 'SUBMITTED', 'SUBMIT'],
  ['SUBMITTED', 'VALIDATION', 'AUTO'],
  ['VALIDATION', 'ENRICHMENT', 'PASS'],
  ['ENRICHMENT', 'SCORING_AND_POLICY', 'COMPLETE'],
  ['SCORING_AND_POLICY', 'APPROVED', 'A/B'],
  ['SCORING_AND_POLICY', 'COUNTER_OFFER', 'COUNTER'],
  ['SCORING_AND_POLICY', 'MANUAL_REVIEW', 'C+flags'],
  ['SCORING_AND_POLICY', 'REJECTED', 'D/E'],
  ['MANUAL_REVIEW', 'APPROVED', 'UW_OK'],
  ['MANUAL_REVIEW', 'REJECTED', 'UW_REJ'],
  ['MANUAL_REVIEW', 'NEED_CLARIFICATION', 'CLARIFY'],
  ['NEED_CLARIFICATION', 'RESUBMITTED', 'RESPOND'],
  ['RESUBMITTED', 'SCORING_AND_POLICY', 'RESCORE'],
  ['APPROVED', 'OFFER_ACCEPTED', 'ACCEPT'],
  ['COUNTER_OFFER', 'OFFER_ACCEPTED', 'ACCEPT'],
  ['OFFER_ACCEPTED', 'CONTRACT_SIGNED', 'SIGN'],
  ['CONTRACT_SIGNED', 'FUNDED', 'DISBURSE'],
  ['DRAFT', 'CANCELLED', 'CANCEL'],
];

const NODE_W = 60;
const NODE_H = 28;
const SCALE_X = 1.5;
const SCALE_Y = 1.0;

function isPassed(state: AppState, current: AppState): boolean {
  if (state === current) return false;
  if (state === 'REJECTED' || state === 'CANCELLED') return false;

  const preDecisionOrder: AppState[] = [
    'DRAFT',
    'SUBMITTED',
    'VALIDATION',
    'ENRICHMENT',
    'SCORING_AND_POLICY',
  ];

  const currentPreIdx = preDecisionOrder.indexOf(current);
  const statePreIdx = preDecisionOrder.indexOf(state);

  if (currentPreIdx !== -1 && statePreIdx !== -1) {
    return statePreIdx < currentPreIdx;
  }

  if (currentPreIdx === -1) {
    if (statePreIdx !== -1) return true;

    const postDecisionOrder: AppState[] = [
      'APPROVED',
      'OFFER_ACCEPTED',
      'CONTRACT_SIGNED',
      'FUNDED',
    ];

    const currentPostIdx = postDecisionOrder.indexOf(current);
    const statePostIdx = postDecisionOrder.indexOf(state);

    if (currentPostIdx !== -1 && statePostIdx !== -1) {
      return statePostIdx < currentPostIdx;
    }

    if (current === 'NEED_CLARIFICATION' && state === 'MANUAL_REVIEW') return true;
    if (current === 'RESUBMITTED' && (state === 'MANUAL_REVIEW' || state === 'NEED_CLARIFICATION')) return true;
  }

  return false;
}

export function StateMachineGraph({ currentState }: Props) {
  const nodeMap = new Map(NODES.map(n => [n.state, n]));

  function nodeColor(state: AppState, current: AppState) {
    if (state === current) return '#EF3124';
    if (state === 'REJECTED' || state === 'CANCELLED') return '#EF4444';
    if (isPassed(state, current)) return '#10B981';
    return '#FFFFFF';
  }

  function nodeStroke(state: AppState, current: AppState) {
    if (state === current) return '#DC2626';
    if (state === 'REJECTED' || state === 'CANCELLED') return '#DC2626';
    if (isPassed(state, current)) return '#059669';
    return '#CBD5E1';
  }

  function textColor(state: AppState, current: AppState) {
    if (state === current) return '#FFFFFF';
    if (state === 'REJECTED' || state === 'CANCELLED') return '#FFFFFF';
    if (isPassed(state, current)) return '#FFFFFF';
    return '#475569';
  }

  const svgW = 410;
  const svgH = 530;

  return (
    <div className="rounded-3xl bg-white border border-neutral-200/80 p-5 space-y-3 shadow-xs alfa-card-hover">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-neutral-900 tracking-tight">Граф состояний заявки (FSM)</h3>
          <p className="text-xs text-neutral-500 mt-0.5">Интерактивный конвейер переходов</p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200/60 text-xs font-semibold text-[#EF3124]">
          <span className="w-2 h-2 rounded-full bg-[#EF3124] animate-pulse" />
          <span>Текущий шаг: {STATE_LABELS[currentState]?.label ?? currentState}</span>
        </div>
      </div>

      <div className="overflow-x-auto bg-[#F8F9FB] rounded-2xl p-2 border border-neutral-200/60">
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto min-w-[320px] max-w-[420px] mx-auto block">
          <defs>
            <filter id="active-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#EF3124" floodOpacity="0.3" />
            </filter>
            <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#94A3B8" />
            </marker>
            <marker id="arrow-active" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#EF3124" />
            </marker>
            <marker id="arrow-passed" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#10B981" />
            </marker>
          </defs>

          {/* Edges */}
          {EDGES.map(([from, to, _label]) => {
            const fn = nodeMap.get(from);
            const tn = nodeMap.get(to);
            if (!fn || !tn) return null;

            let fx: number;
            let fy: number;
            let tx: number;
            let ty: number;

            if (fn.y === tn.y) {
              if (fn.x < tn.x) {
                fx = fn.x * SCALE_X + NODE_W;
                fy = fn.y * SCALE_Y + NODE_H / 2;
                tx = tn.x * SCALE_X - 6;
                ty = tn.y * SCALE_Y + NODE_H / 2;
              } else {
                fx = fn.x * SCALE_X;
                fy = fn.y * SCALE_Y + NODE_H / 2;
                tx = tn.x * SCALE_X + NODE_W + 6;
                ty = tn.y * SCALE_Y + NODE_H / 2;
              }
            } else if (tn.y < fn.y) {
              fx = fn.x * SCALE_X + NODE_W / 2;
              fy = fn.y * SCALE_Y;
              tx = tn.x * SCALE_X + NODE_W / 2;
              ty = tn.y * SCALE_Y + NODE_H + 6;
            } else {
              fx = fn.x * SCALE_X + NODE_W / 2;
              fy = fn.y * SCALE_Y + NODE_H;
              tx = tn.x * SCALE_X + NODE_W / 2;
              ty = tn.y * SCALE_Y - 6;
            }

            const isActive = from === currentState || to === currentState;
            const isTraversed = isPassed(from, currentState) && (isPassed(to, currentState) || to === currentState);

            let strokeColor = '#CBD5E1';
            let markerEnd = 'url(#arrow)';
            let strokeWidth = 1;
            let strokeDasharray: string | undefined = '3 3';

            if (isActive) {
              strokeColor = '#EF3124';
              markerEnd = 'url(#arrow-active)';
              strokeWidth = 1.75;
              strokeDasharray = undefined;
            } else if (isTraversed) {
              strokeColor = '#10B981';
              markerEnd = 'url(#arrow-passed)';
              strokeWidth = 1.25;
              strokeDasharray = undefined;
            }

            return (
              <g key={`${from}-${to}`}>
                <line
                  x1={fx}
                  y1={fy}
                  x2={tx}
                  y2={ty}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  markerEnd={markerEnd}
                  strokeDasharray={strokeDasharray}
                  style={isActive ? { filter: 'drop-shadow(0 0 4px rgba(239, 49, 36, 0.3))' } : undefined}
                />
              </g>
            );
          })}

          {/* Nodes */}
          {NODES.map(({ state, x, y, terminal: _terminal }) => {
            const isCurrent = state === currentState;
            const fill = nodeColor(state, currentState);
            const stroke = nodeStroke(state, currentState);
            const color = textColor(state, currentState);

            const labelMap: Record<AppState, [string, string?]> = {
              DRAFT: ['Черновик'],
              SUBMITTED: ['Отправлена'],
              VALIDATION: ['Валидация'],
              ENRICHMENT: ['Обогащение', 'данных'],
              SCORING_AND_POLICY: ['Скоринг', 'и политика'],
              APPROVED: ['Одобрено'],
              COUNTER_OFFER: ['Контр-оффер'],
              MANUAL_REVIEW: ['Ручной', 'разбор'],
              NEED_CLARIFICATION: ['Нужны', 'уточнения'],
              RESUBMITTED: ['Повторный', 'скоринг'],
              REJECTED: ['Отказ'],
              OFFER_ACCEPTED: ['Оффер', 'принят'],
              CONTRACT_SIGNED: ['Договор', 'подписан'],
              FUNDED: ['Выдача', 'средств'],
              CANCELLED: ['Отменена'],
            };
            const [line1, line2] = labelMap[state] ?? [STATE_LABELS[state]?.label ?? state];

            return (
              <g key={state}>
                {isCurrent && (
                  <rect
                    x={x * SCALE_X - 2}
                    y={y * SCALE_Y - 2}
                    width={NODE_W + 4}
                    height={NODE_H + 4}
                    rx={10}
                    ry={10}
                    fill="none"
                    stroke="#EF3124"
                    strokeWidth={1}
                    opacity={0.6}
                  />
                )}
                <rect
                  x={x * SCALE_X}
                  y={y * SCALE_Y}
                  width={NODE_W}
                  height={NODE_H}
                  rx={8}
                  ry={8}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={isCurrent ? 2 : 1}
                  filter={isCurrent ? 'url(#active-glow)' : undefined}
                  style={isCurrent ? { filter: 'drop-shadow(0 0 8px rgba(239, 49, 36, 0.4))' } : undefined}
                />
                {line2 ? (
                  <text
                    x={x * SCALE_X + NODE_W / 2}
                    y={y * SCALE_Y + NODE_H / 2 - 2}
                    textAnchor="middle"
                    fill={color}
                    fontSize={isCurrent ? 7.5 : 7}
                    fontWeight={isCurrent ? 'bold' : '500'}
                    style={{ fontFamily: 'ui-monospace, monospace' }}
                  >
                    <tspan x={x * SCALE_X + NODE_W / 2} dy="0">{line1}</tspan>
                    <tspan x={x * SCALE_X + NODE_W / 2} dy="8.5">{line2}</tspan>
                  </text>
                ) : (
                  <text
                    x={x * SCALE_X + NODE_W / 2}
                    y={y * SCALE_Y + NODE_H / 2 + 3}
                    textAnchor="middle"
                    fill={color}
                    fontSize={isCurrent ? 7.5 : 7}
                    fontWeight={isCurrent ? 'bold' : '500'}
                    style={{ fontFamily: 'ui-monospace, monospace' }}
                  >
                    {line1}
                  </text>
                )}
                {isCurrent && (
                  <circle
                    cx={x * SCALE_X + NODE_W - 5}
                    cy={y * SCALE_Y + 5}
                    r={2.5}
                    fill="#FFFFFF"
                  >
                    <animate attributeName="r" values="2;3.5;2" dur="1.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="1;0.4;1" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-500 pt-3 border-t border-neutral-100">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#EF3124] shadow-[0_0_6px_rgba(239,49,36,0.4)] inline-block" />
          <span className="text-neutral-700 font-medium">Активный шаг</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#10B981] inline-block" />
          <span className="text-neutral-700 font-medium">Пройдено</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#EF4444] inline-block" />
          <span className="text-neutral-700 font-medium">Отказ / отмена</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-white border border-neutral-300 inline-block" />
          <span className="text-neutral-500 font-medium">Предстоящие</span>
        </div>
      </div>
    </div>
  );
}
