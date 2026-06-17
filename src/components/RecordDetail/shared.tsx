import {
  COLORS,
  getTableCardSummaryBarStyle,
  getTableCardSummaryTotalStyle,
  type ModuleColorKey,
  tableCardSummaryTextStyle,
  UI_COLORS,
} from '@/constants/colors';
import { formatCurrency, formatPercentage } from '@/utils/format';
import { Typography } from 'antd';
import React from 'react';

export const RECORD_DETAIL_DRAWER_WIDTH = 1200;

/** 嵌套在详情 Drawer 内的二级 Drawer 宽度（略窄于主详情，保留少量叠层露边） */
export const NESTED_RECORD_DETAIL_DRAWER_WIDTH = RECORD_DETAIL_DRAWER_WIDTH - 40;

export const RECORD_DETAIL_DRAWER_BODY_STYLE: React.CSSProperties = {
  padding: '16px 24px',
  background: COLORS.bgLayout,
};

/** 详情页主信息 Card 统一样式 */
export const RECORD_DETAIL_CARD_STYLE: React.CSSProperties = {
  borderRadius: '8px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
};

/** 详情页常用区块标题色 */
export const RECORD_DETAIL_SECTION_COLOR = {
  primary: COLORS.primary,
  success: COLORS.success,
} as const;

/** 详情 Card 内区块标题（h3 + 底部分割线） */
export function sectionTitleStyle(
  color: string = RECORD_DETAIL_SECTION_COLOR.primary,
  options?: { isFirst?: boolean },
): React.CSSProperties {
  return {
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '24px',
    color,
    marginTop: options?.isFirst ? 0 : '32px',
    paddingBottom: '8px',
    borderBottom: `1px solid ${COLORS.borderSecondary}`,
  };
}

/** 详情 Drawer 标题：{名称} — {类型} */
export const formatRecordDetailTitle = (
  name: string | undefined | null,
  typeLabel: string,
): string => `${name?.trim() ?? ''} — ${typeLabel}`;

export type TableCardSummaryItem = {
  label: string;
  value: number;
  module?: ModuleColorKey;
};

export type TableCardSummaryBarProps = {
  module: ModuleColorKey;
  selectedCount: number;
  items: TableCardSummaryItem[];
};

/** 详情 TableCard 勾选汇总条 */
export const TableCardSummaryBar: React.FC<TableCardSummaryBarProps> = ({
  module,
  selectedCount,
  items,
}) => {
  const summaryItems = items.map((item) => (
    <span key={item.label} style={tableCardSummaryTextStyle}>
      {item.label}：
      <strong style={getTableCardSummaryTotalStyle(item.module ?? module)}>
        {formatCurrency(item.value)}
      </strong>
    </span>
  ));

  return (
    <div style={getTableCardSummaryBarStyle(module)}>
      <span style={tableCardSummaryTextStyle}>
        已选择 <strong style={{ color: UI_COLORS.action }}>{selectedCount}</strong> 条记录
      </span>
      {items.length === 1 ? (
        summaryItems[0]
      ) : (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px 24px',
            justifyContent: 'flex-end',
          }}
        >
          {summaryItems}
        </div>
      )}
    </div>
  );
};

interface AmountRatioRowProps {
  currentAmount: number;
  contractAmount?: number | null;
  totalAmount?: number | null;
  totalTooltipLabel: string;
}

/** 金额卡片顶部：左本次、右累计 */
export const AmountRatioRow: React.FC<AmountRatioRowProps> = ({
  currentAmount,
  contractAmount,
  totalAmount,
  totalTooltipLabel,
}) => {
  if (!contractAmount || contractAmount <= 0) return null;

  const cumulativeTooltip =
    totalAmount != null
      ? `${totalTooltipLabel} ${formatCurrency(totalAmount)} / 合同 ${formatCurrency(contractAmount)}`
      : undefined;

  return (
    <div
      style={{
        fontSize: '13px',
        color: UI_COLORS.warningText,
        marginBottom: '8px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <span>本次: {formatPercentage(currentAmount, contractAmount)}</span>
      <span title={cumulativeTooltip}>
        累计: {totalAmount != null ? formatPercentage(totalAmount, contractAmount) : '-'}
      </span>
    </div>
  );
};

interface RemarkValueProps {
  value?: string | null;
}

export const RemarkValue: React.FC<RemarkValueProps> = ({ value }) => {
  if (!value?.trim()) {
    return <>无备注</>;
  }
  return (
    <Typography.Text ellipsis={{ tooltip: value }} style={{ display: 'block', maxWidth: '100%' }}>
      {value}
    </Typography.Text>
  );
};
