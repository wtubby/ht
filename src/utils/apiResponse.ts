/** 从标准 API 响应中提取 data；success=false 时视为无数据 */
export function getApiData<T>(result: unknown): T | undefined {
  if (!result || typeof result !== 'object') return undefined;

  const payload = result as { success?: boolean; data?: T };
  if ('success' in payload && payload.success === false) return undefined;
  return payload.data;
}

/** 详情查询 select 的统一入口 */
export function selectApiDetail<T>(result: unknown): T | null {
  return getApiData<T>(result) ?? null;
}

/** 提取实体，兼容少数接口直接返回裸实体的旧格式 */
export function getApiEntity<T extends { id?: number }>(result: unknown): T | undefined {
  const data = getApiData<T>(result);
  if (data) return data;

  if (!result || typeof result !== 'object') return undefined;
  const payload = result as { success?: boolean; id?: number };
  if ('success' in payload && payload.success === false) return undefined;
  if (payload.id) return payload as T;
  return undefined;
}

/** 从标准 API mutation 响应中提取实体 id */
export function getSavedEntityId(result: unknown): number | undefined {
  if (!result || typeof result !== 'object') return undefined;
  const payload = result as { data?: { id?: number }; id?: number };
  return payload.data?.id ?? payload.id;
}
