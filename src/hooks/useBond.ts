import {
  addBond,
  getBond,
  getBonds,
  getBondSelectOptions,
  refundBond,
  removeBond,
  updateBond,
} from '@/services/wtu/bond.api';
import type { QueryClient } from '@tanstack/react-query';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { registerCacheChild } from './factories/cacheRelations';
import { createCrudHooks } from './factories/createCrudHooks';

const bondSelectOptionsKey = ['bondSelectOptions'] as const;

/** 刷新担保分包选择项（含待登记与全量下拉） */
export function invalidateBondSelectOptions(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: bondSelectOptionsKey });
}

registerCacheChild('subContracts', invalidateBondSelectOptions);

const bondCrud = createCrudHooks<
  {
    page?: number;
    pageSize?: number;
    sub_contract_id?: number;
    bond_type?: string;
    bond_form?: string;
    status?: string;
    search?: string;
    sorter?: string;
  },
  API.Bond
>({
  listQueryKey: 'bonds',
  detailQueryKey: 'bond',
  api: {
    list: getBonds,
    get: getBond,
    add: addBond,
    update: updateBond,
    remove: removeBond,
  },
  invalidateRelated: invalidateBondSelectOptions,
});

const bondKeys = {
  bonds: bondCrud.queryKeys.list,
  bond: bondCrud.queryKeys.detail,
  selectOptions: bondSelectOptionsKey,
  pendingOptions: ['bondSelectOptions', 'only_pending'] as const,
};

export const useBond = bondCrud.useDetail;
export const useAddBond = bondCrud.useAdd;
export const useUpdateBond = bondCrud.useUpdate;
export const useRemoveBond = bondCrud.useRemove;

/** 获取选择项（分包合同列表）；新建担保默认仅待登记分包 */
export const useBondSelectOptions = (onlyPending = true, enabled = true) => {
  return useQuery({
    queryKey: onlyPending ? bondKeys.pendingOptions : bondKeys.selectOptions,
    queryFn: () => getBondSelectOptions(onlyPending ? { only_pending: true } : undefined),
    enabled,
  });
};

/** 待登记分包（需担保且尚无对应台账） */
export const useBondPendingOptions = (enabled: boolean) => useBondSelectOptions(true, enabled);

/** React Query fetchQuery 配置（表单编辑态拉取详情） */
export const fetchBondQuery = (id: number) => ({
  queryKey: bondKeys.bond(id),
  queryFn: () => getBond(id),
});

/** 退还担保 */
export const useRefundBond = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: {
        date_end: string;
        account_name: string;
        account_number: string;
        bank_name: string;
        remarks?: string;
      };
    }) => refundBond(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bonds'] });
      queryClient.invalidateQueries({ queryKey: bondKeys.bond(variables.id) });
      invalidateBondSelectOptions(queryClient);
    },
  });
};
