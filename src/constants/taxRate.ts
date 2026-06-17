/** 增值税标准税率（整数，单位：%） */
export const TAX_RATES = [0, 1, 3, 6, 9, 13] as const;

export const TAX_RATE_OPTIONS = TAX_RATES.map((rate) => ({
  label: String(rate),
  value: rate,
}));
