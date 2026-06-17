/**
 * 统一管理所有状态颜色
 * 确保 List 页面和 Detail 页面颜色一致
 */

import { COLORS } from './colors';

// ============ 合同状态颜色 ============
export const contractStatusColors: Record<string, string> = {
  未签约: 'default',
  执行中: 'blue',
  已完工: 'purple',
  已完结: 'green',
};

// ============ 合同类型颜色 ============
export const contractTypeColors: Record<string, string> = {
  专业分包: 'blue',
  劳务分包: 'cyan',
  其他服务: 'orange',
  材料采购: 'purple',
};

// ============ 担保状态颜色 ============
export const bondStatusColors: Record<string, string> = {
  担保中: 'processing',
  已退还: 'success',
  已过期: 'error',
};

// ============ 担保类型颜色 ============
export const bondTypeColors: Record<string, string> = {
  履约保证金: 'blue',
  民工保证金: 'orange',
};

// ============ 担保综合状态颜色（形式+状态） ============
export const bondDisplayStatusColors: Record<string, string> = {
  '现金-担保中': 'success',
  '现金-已退还': 'default',
  '保函-担保中': 'processing',
  '保函-已过期': 'error',
};

// ============ 收款状态 ============
export const RECEIVE_STATUS_OPTIONS = [
  { label: '待确认', value: '待确认' },
  { label: '已确认', value: '已确认' },
] as const;

export const RECEIVE_STATUS_DEFAULT = '待确认';

/** 列表/总包合同等处的累计收款口径说明 */
export const RECEIVE_AMOUNT_STAT_HINT = '包含「待确认」与「已确认」记录';

export const receiveStatusColors: Record<string, string> = {
  待确认: 'processing',
  已确认: 'success',
};

// ============ 银行账户状态颜色 ============
export const bankAccountStatusColors: Record<string, string> = {
  正常: 'success',
  冻结: 'warning',
  销户: 'default',
};

/** 默认银行账户标识 Tag 色 */
export const bankAccountDefaultTagColor = 'blue';

// ============ 单位状态颜色 ============
export const companyStatusColors: Record<string, string> = {
  正常: 'success',
  禁用: 'error',
};

// ============ 单位类型颜色 ============
export const companyTypeColors: Record<string, string> = {
  签约单位: 'success',
  合作单位: 'processing',
};

// ============ 发票 / 文件等辅助 Tag 色 ============
export const invoiceTaxRateTagColor = 'blue';
export const fileModuleTagColor = 'blue';

// ============ 通用颜色获取函数 ============
/** 获取合同状态颜色 */
export const getContractStatusColor = (status: string): string => {
  return contractStatusColors[status] || 'default';
};

/** 获取合同类型颜色 */
export const getContractTypeColor = (type: string): string => {
  return contractTypeColors[type] || 'default';
};

/** 获取担保状态颜色 */
export const getBondStatusColor = (status: string): string => {
  return bondStatusColors[status] || 'default';
};

/** 获取担保类型颜色 */
export const getBondTypeColor = (type: string): string => {
  return bondTypeColors[type] || 'default';
};

/** 获取担保综合状态颜色（形式+状态） */
export const getBondDisplayStatusColor = (bondForm: string, status: string): string => {
  const key = `${bondForm}-${status}`;
  return bondDisplayStatusColors[key] || 'default';
};

/** Ant Design Tag 预设色 → hex（用于图标 inline style 等无法用 Tag 的场景） */
export const antTagPresetHex: Record<string, string> = {
  default: COLORS.borderMuted,
  processing: COLORS.primary,
  success: COLORS.success,
  error: COLORS.danger,
  warning: COLORS.warning,
};

export const getAntTagColorHex = (preset: string): string => {
  return antTagPresetHex[preset] || antTagPresetHex.default;
};

/** 获取担保综合状态 hex 颜色（与 Tag 色一致） */
export const getBondDisplayStatusHex = (bondForm: string | undefined, status: string): string => {
  const tagColor = bondForm
    ? getBondDisplayStatusColor(bondForm, status)
    : getBondStatusColor(status);
  return getAntTagColorHex(tagColor);
};

/** 获取收款状态颜色 */
export const getReceiveStatusColor = (status: string): string => {
  return receiveStatusColors[status] || 'default';
};

/** 获取银行账户状态颜色 */
export const getBankAccountStatusColor = (status: string): string => {
  return bankAccountStatusColors[status] || 'default';
};

/** 获取单位状态颜色 */
export const getCompanyStatusColor = (status: string): string => {
  return companyStatusColors[status] || 'default';
};

/** 获取单位类型颜色 */
export const getCompanyTypeColor = (type: string): string => {
  return companyTypeColors[type] || 'default';
};
