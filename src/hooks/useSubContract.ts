import { getFiles } from '@/services/wtu/file.api';
import {
  addSubContract,
  getSelectOptions,
  getSubContract,
  getSubContracts,
  removeSubContract,
  updateSubContract,
} from '@/services/wtu/subContract.api';
import type { QueryClient } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { CacheInvalidationContext } from './factories/cacheRelations';
import { registerCacheChild } from './factories/cacheRelations';
import { createCrudHooks } from './factories/createCrudHooks';

const SUB_CONTRACT_DETAIL_KEY = 'subContract';

function getSubContractFromCache(cached: unknown): API.SubContract | undefined {
  if (!cached || typeof cached !== 'object') return undefined;
  const wrapped = cached as { data?: API.SubContract };
  return wrapped.data ?? (cached as API.SubContract);
}

function resolveMainContractIdsForSubContractMutation(
  queryClient: QueryClient,
  context?: CacheInvalidationContext,
): number[] {
  if (!context) return [];

  if (context.mutation === 'add') {
    const mainContractId = (context.data as API.SubContract)?.main_contract_id;
    return mainContractId ? [mainContractId] : [];
  }

  if (context.mutation === 'update') {
    const ids = new Set<number>();
    const newMainContractId = (context.data as API.SubContract)?.main_contract_id;
    if (newMainContractId) ids.add(newMainContractId);
    const previous = getSubContractFromCache(context.previousData);
    if (previous?.main_contract_id) ids.add(previous.main_contract_id);
    return [...ids];
  }

  if (context.mutation === 'remove') {
    const fromEntity = (context.entity as API.SubContract | undefined)?.main_contract_id;
    if (fromEntity) return [fromEntity];
    const cached = queryClient.getQueryData([SUB_CONTRACT_DETAIL_KEY, context.id]);
    const detail = getSubContractFromCache(cached);
    return detail?.main_contract_id ? [detail.main_contract_id] : [];
  }

  return [];
}

/** 总包合同变更后需刷新的分包层缓存 */
function invalidateSubContractLayerOnMainContractChange(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['subContracts'] });
  queryClient.invalidateQueries({ queryKey: ['subContract'] });
  queryClient.invalidateQueries({ queryKey: ['subContractSelectOptions'] });
}

registerCacheChild('mainContracts', invalidateSubContractLayerOnMainContractChange);

const subContractCrud = createCrudHooks<
  {
    page?: number;
    pageSize?: number;
    contract_status?: string;
    contract_type?: string;
    main_contract_id?: number;
    party_b_id?: number;
    party_c_id?: number;
    contract_name?: string;
  },
  API.SubContract
>({
  listQueryKey: 'subContracts',
  detailQueryKey: 'subContract',
  api: {
    list: getSubContracts,
    get: getSubContract,
    add: addSubContract,
    update: updateSubContract,
    remove: removeSubContract,
  },
});

/** 分包增删改后刷新所属总包详情页关联数据 */
registerCacheChild('subContracts', (queryClient, context) => {
  const mainContractIds = resolveMainContractIdsForSubContractMutation(queryClient, context);
  if (mainContractIds.length > 0) {
    mainContractIds.forEach((mainContractId) => {
      queryClient.invalidateQueries({ queryKey: ['mainContractRelated', mainContractId] });
    });
    return;
  }
  queryClient.invalidateQueries({ queryKey: ['mainContractRelated'] });
});

export const subContractKeys = {
  subContracts: subContractCrud.queryKeys.list,
  subContract: subContractCrud.queryKeys.detail,
  subContractSelectOptions: ['subContractSelectOptions'] as const,
  contractFiles: (subContractId: number, mainContractId: number) =>
    ['subContractFiles', subContractId, mainContractId] as const,
};

export const useSubContract = subContractCrud.useDetail;
export const useAddSubContract = subContractCrud.useAdd;
export const useUpdateSubContract = subContractCrud.useUpdate;
export const useRemoveSubContract = subContractCrud.useRemove;

/** 分包合同详情附件列表 */
export const useSubContractFiles = (
  subContractId: number | undefined,
  mainContractId: number | undefined,
  enabled?: boolean,
) => {
  const id = subContractId ?? 0;
  const mainId = mainContractId ?? 0;

  return useQuery({
    queryKey: subContractKeys.contractFiles(id, mainId),
    queryFn: () =>
      getFiles({
        file_module: 'FB_CONTRACT',
        main_contract_id: mainId,
        sub_contract_id: id,
        pageSize: 1000,
      }),
    enabled: enabled !== false && !!subContractId && !!mainContractId,
    select: (res) => (res as API.FileList).data ?? [],
  });
};

/** 获取分包表单选择项（总包合同和单位列表） */
export const useSubContractSelectOptions = () => {
  return useQuery({
    queryKey: subContractKeys.subContractSelectOptions,
    queryFn: getSelectOptions,
    staleTime: 10 * 60 * 1000,
  });
};

/** React Query fetchQuery 配置 */
export const fetchSubContractQuery = (id: number) => ({
  queryKey: subContractKeys.subContract(id),
  queryFn: () => getSubContract(id),
});

export const fetchSubContractsQuery = (params: Parameters<typeof getSubContracts>[0]) => ({
  queryKey: subContractKeys.subContracts(params),
  queryFn: () => getSubContracts(params),
});
