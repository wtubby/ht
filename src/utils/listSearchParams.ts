/** 从 URLSearchParams 中提取列表筛选项（忽略空值） */
export function pickSearchParams(
  searchParams: URLSearchParams,
  keys: readonly string[],
): Record<string, string> {
  const result: Record<string, string> = {};
  keys.forEach((key) => {
    const value = searchParams.get(key)?.trim();
    if (value) {
      result[key] = value;
    }
  });
  return result;
}

/** 将状态颜色映射转为 ProTable valueEnum */
export function toSelectValueEnum(
  labels: Record<string, string>,
): Record<string, { text: string }> {
  return Object.fromEntries(Object.keys(labels).map((key) => [key, { text: key }]));
}

/** ProTable 列表页统一的折叠搜索区配置 */
export const LIST_SEARCH_CONFIG = {
  labelWidth: 'auto' as const,
  defaultCollapsed: false,
  span: 6,
};
