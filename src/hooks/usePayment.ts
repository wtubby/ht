import {
  addPayment,
  getPayment,
  getPayments,
  getSelectOptions,
  removePayment,
  updatePayment,
} from '@/services/wtu/payment.api';
import { useQuery } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { registerCacheChild } from './factories/cacheRelations';
import { createCrudHooks } from './factories/createCrudHooks';

const paymentSelectOptionsKey = ['paymentSelectOptions'] as const;

function invalidatePaymentSelectOptions(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: paymentSelectOptionsKey });
}

registerCacheChild('subContracts', invalidatePaymentSelectOptions);

const paymentCrud = createCrudHooks<
  {
    page?: number;
    pageSize?: number;
    sub_contract_id?: number;
    payment_date?: string;
    payer_name?: string;
    payee_name?: string;
    contract_name?: string;
  },
  API.Payment
>({
  listQueryKey: 'payments',
  detailQueryKey: 'payment',
  api: {
    list: getPayments,
    get: getPayment,
    add: addPayment,
    update: updatePayment,
    remove: removePayment,
  },
  invalidateRelated: invalidatePaymentSelectOptions,
});

const paymentKeys = {
  payments: paymentCrud.queryKeys.list,
  payment: paymentCrud.queryKeys.detail,
  selectOptions: paymentSelectOptionsKey,
};

/** 详情页内嵌关联列表（如 SubContractDetail），非 ProTable 列表页使用 */
export const usePayments = paymentCrud.useList;
export const usePayment = paymentCrud.useDetail;
export const useAddPayment = paymentCrud.useAdd;
export const useUpdatePayment = paymentCrud.useUpdate;
export const useRemovePayment = paymentCrud.useRemove;

/** 获取选择项（分包合同列表） */
export const usePaymentSelectOptions = () => {
  return useQuery({
    queryKey: paymentKeys.selectOptions,
    queryFn: getSelectOptions,
    staleTime: 10 * 60 * 1000,
  });
};

/** React Query fetchQuery 配置（表单编辑态拉取详情） */
export const fetchPaymentQuery = (id: number) => ({
  queryKey: paymentKeys.payment(id),
  queryFn: () => getPayment(id),
});
