import { calcBondAmountByRatio, calcBondRatioPercent } from '@/pages/Bond/bond.shared';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseBondAmountRatioOptions {
  /** 合同金额基数 */
  baseAmount: number;
  /** 当前保证金金额（通常来自 Form.useWatch） */
  bondAmount: unknown;
  /** 是否启用金额↔比例联动 */
  active: boolean;
  /** 关闭联动或重置时恢复的比例 */
  defaultRatio?: number | null;
  /** 写回表单金额 */
  setBondAmount: (amount: number | undefined) => void;
  /** 比例为 null 或 ≤0 时是否清空金额（担保登记表单需要） */
  clearAmountOnRatioClear?: boolean;
}

/**
 * 保证金金额与合同额百分比的双向联动：
 * - 改比例 → 算金额
 * - 改金额 → 反算比例
 * - 合同金额变更 → 按当前比例重算金额
 */
export function useBondAmountRatio({
  baseAmount,
  bondAmount,
  active,
  defaultRatio = null,
  setBondAmount,
  clearAmountOnRatioClear = false,
}: UseBondAmountRatioOptions) {
  const [ratio, setRatioState] = useState<number | null>(defaultRatio ?? null);
  const baseAmountRef = useRef(baseAmount);
  const prevBaseAmountRef = useRef(baseAmount);
  const ratioRef = useRef(ratio);
  baseAmountRef.current = baseAmount;
  ratioRef.current = ratio;

  const setRatio = useCallback((value: number | null) => {
    setRatioState(value);
  }, []);

  const resetRatio = useCallback(() => {
    setRatioState(defaultRatio ?? null);
  }, [defaultRatio]);

  const handleRatioChange = useCallback(
    (value: number | null) => {
      setRatioState(value);
      if (!active || baseAmount <= 0) return;
      if (value != null && value > 0) {
        setBondAmount(calcBondAmountByRatio(baseAmount, value));
      } else if (clearAmountOnRatioClear) {
        setBondAmount(undefined);
      }
    },
    [active, baseAmount, setBondAmount, clearAmountOnRatioClear],
  );

  // 仅在金额变化时反算比例；baseAmount 变更由下方 effect 按当前比例重算金额后再触发
  useEffect(() => {
    const currentBase = baseAmountRef.current;
    if (!active || currentBase <= 0) return;
    if (bondAmount == null || bondAmount === '') {
      setRatioState(null);
      return;
    }
    const num = Number(bondAmount);
    if (!Number.isFinite(num) || num <= 0) {
      setRatioState(null);
      return;
    }
    const next = calcBondRatioPercent(num, currentBase);
    if (next != null) {
      setRatioState(next);
    }
  }, [bondAmount, active]);

  useEffect(() => {
    const prev = prevBaseAmountRef.current;
    prevBaseAmountRef.current = baseAmount;
    if (!active || baseAmount <= 0 || prev <= 0 || prev === baseAmount) return;
    const currentRatio = ratioRef.current;
    if (currentRatio == null || currentRatio <= 0) return;
    setBondAmount(calcBondAmountByRatio(baseAmount, currentRatio));
  }, [baseAmount, active, setBondAmount]);

  return { ratio, setRatio, resetRatio, handleRatioChange };
}
