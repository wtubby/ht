import type { QueryClient } from '@tanstack/react-query';

export type CacheInvalidationContext =
  | { mutation: 'add'; data: unknown; response: unknown }
  | { mutation: 'update'; id: number; data: unknown; previousData?: unknown }
  | { mutation: 'remove'; id: number; entity?: unknown };

type CacheInvalidator = (queryClient: QueryClient, context?: CacheInvalidationContext) => void;

const childInvalidators = new Map<string, Set<CacheInvalidator>>();

/** 登记父实体 listQueryKey 变更时需刷新的子层缓存 */
export function registerCacheChild(parentKey: string, invalidator: CacheInvalidator) {
  const existing = childInvalidators.get(parentKey);
  if (existing) {
    existing.add(invalidator);
    return;
  }
  childInvalidators.set(parentKey, new Set([invalidator]));
}

/** 父实体 mutation 成功后级联失效已登记的子层缓存 */
export function invalidateChildren(
  parentKey: string,
  queryClient: QueryClient,
  context?: CacheInvalidationContext,
) {
  childInvalidators.get(parentKey)?.forEach((invalidator) => invalidator(queryClient, context));
}
