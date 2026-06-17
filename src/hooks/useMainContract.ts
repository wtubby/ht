import {
  addMainContract,
  getMainContract,
  getMainContractRelated,
  getMainContracts,
  getSelectOptions,
  removeMainContract,
  updateMainContract,
} from '@/services/wtu/mainContract.api';
import { useQuery } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { getSavedEntityId } from '@/utils/apiResponse';
import type { CacheInvalidationContext } from './factories/cacheRelations';
import { createCrudHooks } from './factories/createCrudHooks';

function resolveMainContractIdFromMutation(
  context?: CacheInvalidationContext,
): number | undefined {
  if (!context) return undefined;
  if (context.mutation === 'add') {
    return getSavedEntityId(context.response);
  }
  if (context.mutation === 'update' || context.mutation === 'remove') {
    return context.id;
  }
  return undefined;
}

function invalidateMainContractOwnCaches(
  queryClient: QueryClient,
  context?: CacheInvalidationContext,
) {
  const id = resolveMainContractIdFromMutation(context);
  if (id) {
    queryClient.invalidateQueries({ queryKey: ['mainContractRelated', id] });
    return;
  }
  queryClient.invalidateQueries({ queryKey: ['mainContractRelated'] });
}

const mainContractCrud = createCrudHooks<
  {
    page?: number;
    pageSize?: number;
    contract_name?: string;
    contract_status?: string;
    party_a_id?: number;
    party_b_id?: number;
  },
  API.MainContract
>({
  listQueryKey: 'mainContracts',
  detailQueryKey: 'mainContract',
  api: {
    list: getMainContracts,
    get: getMainContract,
    add: addMainContract,
    update: updateMainContract,
    remove: removeMainContract,
  },
  invalidateRelated: invalidateMainContractOwnCaches,
});

const mainContractKeys = {
  mainContracts: mainContractCrud.queryKeys.list,
  mainContract: mainContractCrud.queryKeys.detail,
  mainContractRelated: (id: number) => ['mainContractRelated', id] as const,
  companiesForSelect: ['companiesForSelect'] as const,
};

export const useMainContract = mainContractCrud.useDetail;
export const useAddMainContract = mainContractCrud.useAdd;
export const useUpdateMainContract = mainContractCrud.useUpdate;
export const useRemoveMainContract = mainContractCrud.useRemove;

type MainContractRelatedData = {
  receives: API.Receive[];
  invoiceOuts: API.InvoiceOut[];
  subContracts: API.SubContract[];
  files: API.File[];
  subContractStats: Record<number, { paymentTotal: number; invoiceTotal: number }>;
};

/** 获取总包合同详情页关联数据 */
export const useMainContractRelated = (id?: number, enabled = true) => {
  return useQuery({
    queryKey: mainContractKeys.mainContractRelated(id!),
    queryFn: async () => {
      const response = await getMainContractRelated(id!);
      if (!response.success || !response.data) {
        throw new Error('加载关联数据失败');
      }
      return response.data as MainContractRelatedData;
    },
    enabled: enabled && !!id,
  });
};

/** 获取单位选择项（发包单位、承包单位） */
export const useCompaniesForSelect = () => {
  return useQuery({
    queryKey: mainContractKeys.companiesForSelect,
    queryFn: getSelectOptions,
    staleTime: 10 * 60 * 1000,
  });
};

/** React Query fetchQuery 配置 */
export const fetchMainContractQuery = (id: number) => ({
  queryKey: mainContractKeys.mainContract(id),
  queryFn: () => getMainContract(id),
});

export const fetchMainContractsQuery = (params: Parameters<typeof getMainContracts>[0]) => ({
  queryKey: mainContractKeys.mainContracts(params),
  queryFn: () => getMainContracts(params),
});
