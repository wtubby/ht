import { COLORS } from '@/constants/colors';
import {
  formatAmount,
  getProgressBarWidthPct,
  isProgressOver,
  OVER_PROGRESS_BAR_COLOR,
  OVER_PROGRESS_COLOR,
  OVER_SETTLEMENT_HINT,
} from '@/utils/format';
import { Tooltip } from 'antd';
import React from 'react';

export interface AmountProgressStatCardProps {
  label: string;
  value: number;
  barColor: string;
  textColor: string;
  pct: number | null;
  statHint?: string;
  overHint?: string;
  labelFontSize?: number;
}

const AmountProgressStatCard: React.FC<AmountProgressStatCardProps> = ({
  label,
  value,
  barColor,
  textColor,
  pct,
  statHint,
  overHint = OVER_SETTLEMENT_HINT,
  labelFontSize = 13,
}) => {
  const isOver = pct !== null && isProgressOver(pct);
  const barWidth = pct !== null ? getProgressBarWidthPct(pct) : 100;
  const displayBarColor = isOver ? OVER_PROGRESS_BAR_COLOR : barColor;
  const displayTextColor = isOver ? OVER_PROGRESS_COLOR : textColor;
  const formattedValue = formatAmount(value);

  return (
    <div
      className="stat-card"
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '8px',
        padding: '12px 14px',
        border: isOver ? `1px solid ${OVER_PROGRESS_COLOR}` : '0.5px solid rgba(0,0,0,0.08)',
        background: COLORS.bgContainer,
        height: '72px',
      }}
      title={`¥ ${formattedValue}`}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: `${barWidth}%`,
          background: displayBarColor,
          borderRadius: pct !== null && barWidth < 100 ? '8px 0 0 8px' : '8px',
          transition: 'width 0.8s cubic-bezier(.4,0,.2,1)',
        }}
      />

      {pct !== null && (
        <Tooltip title={isOver ? overHint : undefined}>
          <div
            style={{
              position: 'absolute',
              top: 8,
              right: 10,
              fontSize: '12px',
              fontWeight: 500,
              zIndex: 2,
              color: displayTextColor,
            }}
          >
            {pct.toFixed(1)}%
          </div>
        </Tooltip>
      )}

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ color: COLORS.textTertiary, fontSize: labelFontSize, marginBottom: '4px' }}>
          {statHint ? (
            <Tooltip title={statHint}>
              <span style={{ borderBottom: `1px dashed ${COLORS.borderMuted}`, cursor: 'help' }}>
                {label}
              </span>
            </Tooltip>
          ) : (
            label
          )}
        </div>
        <div
          style={{
            color: displayTextColor,
            fontSize: '18px',
            fontWeight: isOver ? 400 : 600,
            fontFamily: 'DIN, "Helvetica Neue", Arial, sans-serif',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          ¥ {formattedValue}
        </div>
      </div>
    </div>
  );
};

export default AmountProgressStatCard;
