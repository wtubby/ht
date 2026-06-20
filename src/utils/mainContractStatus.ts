import dayjs from 'dayjs';

export type MainContractStatusValue = '未签约' | '执行中' | '已完工' | '已完结';

type StatusInput = {
  date_signed?: string | null;
  date_end?: string | null;
  amount_settlement?: number | null;
};

type StatusTotals = {
  total_received?: number | null;
  total_invoiced?: number | null;
};

const AMOUNT_EPSILON = 0.005;

function toAmount(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function isAmountSatisfied(total: unknown, target: unknown): boolean {
  const settlement = toAmount(target);
  if (settlement == null || settlement <= 0) return false;
  const amount = toAmount(total) ?? 0;
  return amount + AMOUNT_EPSILON >= settlement;
}

/** 与后端 resolveMainContractStatus 规则一致 */
export function resolveMainContractStatus(
  contract: StatusInput,
  totals: StatusTotals = {},
): MainContractStatusValue {
  const dateSigned = contract.date_signed;
  const dateEnd = contract.date_end;
  const settlement = toAmount(contract.amount_settlement);
  const totalReceived = toAmount(totals.total_received) ?? 0;
  const totalInvoiced = toAmount(totals.total_invoiced) ?? 0;

  if (
    dateEnd &&
    settlement != null &&
    isAmountSatisfied(totalReceived, settlement) &&
    isAmountSatisfied(totalInvoiced, settlement)
  ) {
    return '已完结';
  }
  if (dateEnd) return '已完工';
  if (dateSigned) return '执行中';
  return '未签约';
}

export function formatMainContractDateValue(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && 'format' in value) {
    return (value as { format: (pattern: string) => string }).format('YYYY-MM-DD');
  }
  return undefined;
}

function toWarrantyYears(value: unknown): number | null {
  if (value == null || value === '') return null;
  const years = Number(value);
  return Number.isFinite(years) && years >= 0 ? years : null;
}

/** 与后端 computeWarrantyEndDate 规则一致 */
export function computeWarrantyEndDate(
  dateEnd?: string | null,
  warrantyYears?: number | string | null,
): string | undefined {
  const end = dateEnd?.trim();
  const years = toWarrantyYears(warrantyYears);
  if (!end || years == null) return undefined;

  const months = Math.round(years * 12);
  const computed = dayjs(end).add(months, 'month');
  return computed.isValid() ? computed.format('YYYY-MM-DD') : undefined;
}
