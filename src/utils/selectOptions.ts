export type NumberSelectOption = { label: string; value: number };

/** 当前选中项不在 options 中时，在列表头部补一条占位项（用于编辑回显） */
export function appendMissingSelectOption(
  options: NumberSelectOption[],
  optionId: number | undefined,
  label: string | undefined,
  suffix: string,
  fallbackLabel = '未知',
): NumberSelectOption[] {
  if (!optionId || options.some((o) => o.value === optionId)) {
    return options;
  }
  return [{ label: `${label ?? fallbackLabel}（${suffix}）`, value: optionId }, ...options];
}

export function appendInactiveCompanyOption(
  options: NumberSelectOption[],
  companyId: number | undefined,
  company: API.Company | undefined,
): NumberSelectOption[] {
  return appendMissingSelectOption(
    options,
    companyId,
    company?.company_name,
    '已停用',
    '未知单位',
  );
}
