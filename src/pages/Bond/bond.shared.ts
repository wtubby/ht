import { SafetyOutlined, TeamOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import { formatAmount } from '@/utils/format';

export type BondType = '履约保证金' | '民工保证金';

export type BondCreatePreset = {
  sub_contract_id?: number;
  bond_type?: BondType;
};
export type BondFormValue = '现金' | '保函';
type BondPlannedForm = BondFormValue | '不限';

type BondRegistryItem = {
  bond_id: number | null;
  required: boolean;
  planned_amount: number | null;
  planned_form: BondPlannedForm | null;
};

type BondWarning = {
  code: string;
  message: string;
  planned_amount?: number;
  actual_amount?: number;
  planned_form?: string;
  actual_form?: string;
};

export const BOND_TYPE_OPTIONS: { label: string; value: BondType }[] = [
  { label: '履约保证金', value: '履约保证金' },
  { label: '民工保证金', value: '民工保证金' },
];

export const BOND_TYPE_ICONS = {
  履约保证金: SafetyOutlined,
  民工保证金: TeamOutlined,
} as const satisfies Record<BondType, typeof SafetyOutlined>;

export const DEFAULT_RATIO_BY_TYPE: Record<BondType, number> = {
  履约保证金: 5,
  民工保证金: 2,
};

/** 保证金比例基数：仅合同金额，不含结算金额 */
export const getContractBaseAmount = (
  contract?: Pick<API.SubContract, 'amount_contract'> | null,
): number => {
  const base = Number(contract?.amount_contract);
  return Number.isFinite(base) && base > 0 ? base : 0;
};

export const calcBondAmountByRatio = (baseAmount: number, ratio: number): number => {
  if (!baseAmount || baseAmount <= 0) return 0;
  return Number(((baseAmount * ratio) / 100).toFixed(2));
};

/** 保证金金额占分包合同额的百分比（与台账列表 bond_ratio 算法一致） */
export const calcBondRatioPercent = (
  amount?: number | null,
  contractAmount?: number | null,
): number | null => {
  const amt = Number(amount);
  const base = Number(contractAmount);
  if (!Number.isFinite(amt) || amt <= 0 || !Number.isFinite(base) || base <= 0) return null;
  return Number(((amt / base) * 100).toFixed(2));
};

const getBondRegistryItem = (
  contract: API.SubContract | null | undefined,
  bondType: BondType,
): BondRegistryItem | null => {
  if (!contract?.bond_registry) return null;
  return contract.bond_registry[bondType] ?? null;
};

export const applyBondDefaults = (
  contract: API.SubContract | null | undefined,
  bondType: BondType,
): {
  amount?: number;
  bond_form?: BondFormValue;
  blocked: boolean;
  blockMessage?: string;
} => {
  const registry = getBondRegistryItem(contract, bondType);
  if (registry?.bond_id) {
    return {
      blocked: true,
      blockMessage: `该分包已登记${bondType}，请从列表编辑已有记录`,
    };
  }

  const updates: { amount?: number; bond_form?: BondFormValue; blocked: boolean } = {
    blocked: false,
  };

  if (registry?.planned_amount != null && registry.planned_amount > 0) {
    updates.amount = registry.planned_amount;
  }

  const plannedForm = registry?.planned_form;
  if (plannedForm === '现金' || plannedForm === '保函') {
    updates.bond_form = plannedForm;
  }

  return updates;
};

export const showBondWarnings = (
  warnings: BondWarning[] | undefined,
  messageApi: { warning: (content: string) => void },
) => {
  if (!warnings?.length) return;
  warnings.forEach((item) => {
    messageApi.warning(item.message);
  });
};

export const formatBondStatusLabel = (bondForm?: string, displayStatus?: string): string => {
  if (!displayStatus) return '-';
  return bondForm ? `${bondForm} · ${displayStatus}` : displayStatus;
};

type PendingBondRow = {
  key: string;
  sub_contract_id: number;
  contract_name: string;
  party_c_name: string;
  bond_type: BondType;
  planned_amount: number | null;
  planned_form: BondPlannedForm | null;
  amount_contract?: number;
};

export const flattenPendingBondRows = (subContracts: API.SubContract[]): PendingBondRow[] => {
  const rows: PendingBondRow[] = [];
  subContracts.forEach((contract) => {
    (contract.pending_bond_types || []).forEach((bondType) => {
      const registry = contract.bond_registry?.[bondType];
      rows.push({
        key: `${contract.id}-${bondType}`,
        sub_contract_id: contract.id!,
        contract_name: contract.contract_name || '-',
        party_c_name: contract.partyC?.company_name || '-',
        bond_type: bondType,
        planned_amount: registry?.planned_amount ?? null,
        planned_form: registry?.planned_form ?? null,
        amount_contract: contract.amount_contract,
      });
    });
  });
  return rows;
};

export const hasBondAmountDeviation = (
  planned?: number | null,
  actual?: number | null,
): boolean => {
  if (planned == null || planned <= 0 || actual == null) return false;
  return Math.abs(Number(actual) - planned) >= 0.005;
};

export const hasBondFormDeviation = (
  planned?: BondPlannedForm | null,
  actual?: string | null,
): boolean => {
  if (!planned || planned === '不限' || !actual) return false;
  return planned !== actual;
};

/** 结束日期不得早于开始日期（仅比较到日） */
export const validateBondDateEndAfterStart = (
  end?: Dayjs | string | null,
  start?: Dayjs | string | null,
): string | null => {
  if (!end || !start) return null;
  if (dayjs(end).isBefore(dayjs(start), 'day')) {
    return '结束日期不能早于开始日期';
  }
  return null;
};

/** 提交前确认：与分包合同约定不一致时的提示文案（与后端 warnings 口径一致） */
export const collectBondDeviationMessages = (
  contract: API.SubContract | null | undefined,
  bondType: BondType,
  actual: { amount?: number | null; bond_form?: string | null },
): string[] => {
  const registry = getBondRegistryItem(contract, bondType);
  if (!registry) return [];

  const messages: string[] = [];
  const actualAmount = actual.amount != null ? Number(actual.amount) : null;

  if (hasBondAmountDeviation(registry.planned_amount, actualAmount)) {
    messages.push(
      `约定金额：${formatAmount(registry.planned_amount)} 元，本次录入：${formatAmount(actualAmount)} 元，与约定不一致，请确认。`,
    );
  }
  if (hasBondFormDeviation(registry.planned_form, actual.bond_form)) {
    messages.push(
      `合同约定形式为「${registry.planned_form}」，与录入的「${actual.bond_form}」不一致，请确认。`,
    );
  }
  return messages;
};

/** 现金担保且状态为担保中时可退还 */
export const canRefundBond = (bond?: API.Bond | null): boolean => {
  if (!bond?.id) return false;
  const status = bond.display_status ?? bond.status;
  return bond.bond_form === '现金' && status === '担保中';
};
