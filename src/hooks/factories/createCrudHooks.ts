import type { QueryClient } from '@tanstack/react-query';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSavedEntityId } from '../../utils/apiResponse';
import { invalidateChildren, type CacheInvalidationContext } from './cacheRelations';

type MutationOptions = Record<string, unknown>;

const DEFAULT_MUTATION_OPTIONS: MutationOptions = { skipErrorHandler: true };

export interface CrudApi<TParams extends object, TEntity> {
  list: (params: TParams) => Promise<unknown>;
  get: (id: number) => Promise<unknown>;
  add: (data: TEntity, options?: MutationOptions) => Promise<unknown>;
  update: (id: number, data: TEntity, options?: MutationOptions) => Promise<unknown>;
  remove: (id: number, options?: MutationOptions) => Promise<unknown>;
}

export interface CrudHooksConfig<TParams extends object, TEntity> {
  listQueryKey: string;
  detailQueryKey: string;
  api: CrudApi<TParams, TEntity>;
  mutationOptions?: MutationOptions;
  /** add 响应中提取详情 id；默认读 data.id / id */
  getDetailIdFromAddResult?: (data: unknown) => number | undefined;
  /** add / update / remove 成功后统一失效关联缓存 */
  invalidateRelated?: (queryClient: QueryClient, context?: CacheInvalidationContext) => void;
  onAddSuccess?: (queryClient: QueryClient) => void;
  onUpdateSuccess?: (queryClient: QueryClient, variables: { id: number; data: TEntity }) => void;
  onRemoveSuccess?: (queryClient: QueryClient) => void;
}

/**
 * 生成标准 CRUD React Query hooks
 */
export function createCrudHooks<TParams extends object, TEntity>(
  config: CrudHooksConfig<TParams, TEntity>,
) {
  const {
    listQueryKey,
    detailQueryKey,
    api,
    mutationOptions = DEFAULT_MUTATION_OPTIONS,
    getDetailIdFromAddResult = getSavedEntityId,
    invalidateRelated,
    onAddSuccess,
    onUpdateSuccess,
    onRemoveSuccess,
  } = config;

  const queryKeys = {
    list: (params?: object) => [listQueryKey, params] as const,
    detail: (id: number) => [detailQueryKey, id] as const,
  };

  function useList(params?: TParams, enabled?: boolean) {
    return useQuery({
      queryKey: queryKeys.list(params),
      queryFn: () => api.list(params || ({} as TParams)),
      enabled: enabled !== false,
    });
  }

  function useDetail(id: number, enabled?: boolean) {
    return useQuery({
      queryKey: queryKeys.detail(id),
      queryFn: () => api.get(id),
      enabled: enabled !== false && !!id,
    });
  }

  function useAdd() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (data: TEntity) => api.add(data, mutationOptions),
      onSuccess: (response, variables) => {
        const id = getDetailIdFromAddResult(response);
        if (id != null) {
          queryClient.setQueryData(queryKeys.detail(id), response);
        }
        const invalidationContext: CacheInvalidationContext = {
          mutation: 'add',
          data: variables,
          response,
        };
        queryClient.invalidateQueries({ queryKey: [listQueryKey] });
        invalidateRelated?.(queryClient, invalidationContext);
        invalidateChildren(listQueryKey, queryClient, invalidationContext);
        onAddSuccess?.(queryClient);
      },
    });
  }

  function useUpdate() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({ id, data }: { id: number; data: TEntity }) =>
        api.update(id, data, mutationOptions),
      onSuccess: (response, variables) => {
        const previousData = queryClient.getQueryData(queryKeys.detail(variables.id));
        queryClient.setQueryData(queryKeys.detail(variables.id), response);
        const invalidationContext: CacheInvalidationContext = {
          mutation: 'update',
          id: variables.id,
          data: variables.data,
          previousData,
        };
        queryClient.invalidateQueries({ queryKey: [listQueryKey] });
        invalidateRelated?.(queryClient, invalidationContext);
        invalidateChildren(listQueryKey, queryClient, invalidationContext);
        onUpdateSuccess?.(queryClient, variables);
      },
    });
  }

  function useRemove() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({ id }: { id: number; entity?: TEntity }) =>
        api.remove(id, mutationOptions),
      onSuccess: (_response, variables) => {
        const invalidationContext: CacheInvalidationContext = {
          mutation: 'remove',
          id: variables.id,
          entity: variables.entity,
        };
        queryClient.invalidateQueries({ queryKey: [listQueryKey] });
        invalidateRelated?.(queryClient, invalidationContext);
        invalidateChildren(listQueryKey, queryClient, invalidationContext);
        onRemoveSuccess?.(queryClient);
      },
    });
  }

  return {
    queryKeys,
    useList,
    useDetail,
    useAdd,
    useUpdate,
    useRemove,
  };
}
