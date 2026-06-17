/**
 * 通用格式化工具函数
 * 统一管理金额、百分比等格式化逻辑
 */

import { COLORS, UI_COLORS } from '@/constants/colors';
import type { ReactNode } from 'react';
import { createElement } from 'react';

/** 将未知类型解析为有效金额数字，非法值返回 null */
export const toAmountNumber = (amount: unknown): number | null => {
  if (amount === null || amount === undefined || amount === '') return null;
  const num = Number(amount);
  return isNaN(num) || !isFinite(num) ? null : num;
};

export interface FormatAmountOrDashOptions {
  /** 为 true 时，0 显示为 "-" */
  zeroAsDash?: boolean;
  decimals?: number;
}

/**
 * 格式化金额为固定小数位（无千分位）
 * @param amount - 金额数字
 * @param decimals - 小数位数，默认2位
 * @returns 格式化后的金额字符串，如 "1234.56"；非法值返回 "0.00"
 */
export const formatAmount = (amount: number | undefined | null, decimals: number = 2): string => {
  const num = toAmountNumber(amount);
  if (num === null) {
    return decimals === 2 ? '0.00' : '0';
  }
  return num.toFixed(decimals);
};

/** InputNumber / ProFormDigit 输入框 formatter */
export const amountFormatter = (value: number | string | undefined): string =>
  value != null && value !== '' ? `${value}` : '';

/** InputNumber / ProFormDigit 输入框 parser：去除货币符号、逗号与空格后转数字，空值返回 0 */
export const parseAmount = (value: string | undefined): number =>
  value ? Number(value.replace(/[$,\s]/g, '')) : 0;

/** 可选金额字段 parser：空值时不写入 0 */
export const parseOptionalAmount = (value: string | undefined): number =>
  value ? Number(value.replace(/[$,\s]/g, '')) : (null as unknown as number);

/**
 * 表格/列表金额：非法值显示 "-"
 * @param zeroAsDash - 为 true 时 0 也显示 "-"
 */
export const formatAmountOrDash = (
  amount: unknown,
  options?: FormatAmountOrDashOptions,
): string => {
  const { zeroAsDash = false, decimals = 2 } = options ?? {};
  const num = toAmountNumber(amount);
  if (num === null) return '-';
  if (zeroAsDash && num === 0) return '-';
  return num.toFixed(decimals);
};

/**
 * 格式化百分比
 */
export const formatPercentage = (
  current: number | undefined | null,
  total: number | undefined | null,
  decimals: number = 2,
): string => {
  const c = Number(current) || 0;
  const t = Number(total) || 0;
  if (t === 0) return '0.00%';
  const percentage = (c / t) * 100;
  return `${percentage.toFixed(decimals)}%`;
};

/**
 * 详情页金额：带货币符号，非法值显示 "¥ 0.00"
 */
export const formatCurrency = (amount: number | undefined | null, symbol: string = '¥'): string => {
  return `${symbol} ${formatAmount(amount)}`;
};

/**
 * TableCard / 打印：带货币符号，非法值显示 "-"
 */
export const formatCurrencyOrDash = (amount: unknown, symbol: string = '¥'): string => {
  const num = toAmountNumber(amount);
  if (num === null) return '-';
  return `${symbol} ${num.toFixed(2)}`;
};

/**
 * 将中文日期（如"2024年01月15日"）转换为标准日期格式（"2024-01-15"）
 */
export const convertChineseDateToStandard = (chineseDate: string): string | null => {
  if (!chineseDate) return null;
  const match = chineseDate.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (match) {
    const [, year, month, day] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return chineseDate;
};

/** 金额进度超 100% 时的警示色 */
export const OVER_PROGRESS_COLOR = UI_COLORS.overLimit;
export const OVER_PROGRESS_BAR_COLOR = UI_COLORS.overLimitBg;
export const OVER_SETTLEMENT_HINT = '已超结算金额';

/** 计算相对结算/合同基数的进度百分比（不封顶） */
export const calcProgressPct = (
  current: number | undefined | null,
  base: number | undefined | null,
): number => {
  const total = Number(base) || 0;
  if (total <= 0) return 0;
  return ((Number(current) || 0) / total) * 100;
};

export const getProgressBarWidthPct = (pct: number): number => Math.min(pct, 100);

export const isProgressOver = (pct: number): boolean => pct > 100;

/** 合同列表行：用于累计收款/付款/开票占基数的百分比展示 */
export interface AmountProgressRecord {
  amount_settlement?: number | null;
  amount_contract?: number | null;
}

export const getContractAmountBase = (record: AmountProgressRecord): number =>
  Number(record.amount_settlement) || Number(record.amount_contract) || 0;

/**
 * 列表列渲染：金额 + 相对结算/合同基数的百分比（超 100% 时副行警示色）
 */
export const renderAmountWithPercentage = (
  text: unknown,
  record: AmountProgressRecord,
): ReactNode => {
  const formatted = formatAmountOrDash(text, { zeroAsDash: true });
  if (formatted === '-') return '-';

  const percentage = calcProgressPct(Number(text) || 0, getContractAmountBase(record));
  const isOver = isProgressOver(percentage);

  return createElement(
    'div',
    { style: { lineHeight: 1.2 } },
    createElement('div', null, formatted),
    createElement(
      'div',
      {
        style: {
          fontSize: '12px',
          color: isOver ? OVER_PROGRESS_COLOR : COLORS.textTertiary,
        },
      },
      `${percentage.toFixed(2)}%`,
    ),
  );
};
