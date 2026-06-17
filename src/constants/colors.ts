/**
 * 全局颜色入口。
 *
 * COLORS 是基础设计色；UI_COLORS 是非状态 UI 语义色；
 * 业务状态到颜色的映射仍放在 statusColors.ts。
 */

import type { CSSProperties } from 'react';

export const COLORS = {
  primary: '#1677ff',
  success: '#52c41a',
  warning: '#faad14',
  danger: '#ff4d4f',
  text: '#262626',
  textSecondary: '#595959',
  textTertiary: '#8c8c8c',
  bgContainer: '#ffffff',
  bgLayout: '#f0f2f5',
  bgSubtle: '#fafafa',
  bgHover: '#f5f5f5',
  border: '#f0f0f0',
  borderSecondary: '#e8e8e8',
  borderMuted: '#d9d9d9',
} as const;

export const UI_COLORS = {
  action: COLORS.primary,
  actionDanger: COLORS.danger,
  actionWarning: COLORS.warning,
  amount: COLORS.text,
  amountHighlight: COLORS.primary,
  amountMuted: COLORS.textTertiary,
  attachment: COLORS.primary,
  warningBg: '#fff7e6',
  warningBgSoft: '#fffbe6',
  warningBorder: '#ffd591',
  warningText: '#fa8c16',
  overLimit: '#cf1322',
  overLimitBg: '#fff1f0',
} as const;

/** 将 #RRGGBB 转为 rgba，用于模块浅色背景等 */
export function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((c) => c + c)
          .join('')
      : normalized;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const MODULE_ACCENT = {
  subContract: '#722ed1',
  invoiceIn: '#13c2c2',
  bond: '#2f54eb',
} as const;

export const CHART_COLORS = {
  categorical: [
    COLORS.primary,
    COLORS.success,
    COLORS.warning,
    MODULE_ACCENT.subContract,
    '#fa541c',
    MODULE_ACCENT.invoiceIn,
    '#eb2f96',
  ],
  comparison: ['#ff7a45', '#13c2c2'],
} as const;

export const MODULE_COLORS = {
  mainContract: {
    color: COLORS.primary,
    bg: hexToRgba(COLORS.primary, 0.08),
  },
  subContract: {
    color: MODULE_ACCENT.subContract,
    bg: hexToRgba(MODULE_ACCENT.subContract, 0.08),
  },
  receive: {
    color: COLORS.success,
    bg: hexToRgba(COLORS.success, 0.08),
  },
  payment: {
    color: UI_COLORS.warningText,
    bg: hexToRgba(UI_COLORS.warningText, 0.08),
  },
  invoiceOut: {
    color: COLORS.warning,
    bg: hexToRgba(COLORS.warning, 0.1),
  },
  invoiceIn: {
    color: MODULE_ACCENT.invoiceIn,
    bg: hexToRgba(MODULE_ACCENT.invoiceIn, 0.08),
  },
  bond: {
    color: MODULE_ACCENT.bond,
    bg: hexToRgba(MODULE_ACCENT.bond, 0.08),
  },
  file: {
    color: COLORS.textSecondary,
    bg: COLORS.bgSubtle,
  },
} as const;

export type ModuleColorKey = keyof typeof MODULE_COLORS;

/** 详情 TableCard 汇总条容器 */
export const getTableCardSummaryBarStyle = (module: ModuleColorKey): CSSProperties => ({
  padding: '12px 20px',
  background: MODULE_COLORS[module].bg,
  borderRadius: '8px',
  marginBottom: '16px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  border: `1px solid ${COLORS.borderSecondary}`,
});

/** 详情 TableCard 汇总条辅助文案 */
export const tableCardSummaryTextStyle: CSSProperties = {
  fontSize: '14px',
  color: COLORS.textSecondary,
};

/** 详情 TableCard 金额列单元格 */
export const getTableCardAmountCellStyle = (module: ModuleColorKey): CSSProperties => ({
  color: MODULE_COLORS[module].color,
  fontWeight: 600,
  fontSize: '14px',
});

/** 详情 TableCard 汇总金额数字 */
export const getTableCardSummaryTotalStyle = (module: ModuleColorKey): CSSProperties => ({
  color: MODULE_COLORS[module].color,
  fontSize: '20px',
  fontWeight: 700,
  fontFamily: 'DIN, Arial',
  marginLeft: '8px',
});
