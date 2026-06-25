import {
  addReceive,
  getReceive,
  getReceiveList,
  getReceiveSelectOptions,
  removeReceive,
  updateReceive,
} from '@/services/wtu/receive.api';
import { useQuery } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { registerCacheChild } from './factories/cacheRelations';
import { createCrudHooks } from './factories/createCrudHooks';

const receiveSelectOptionsKey = ['receiveSelectOptions'] as const;

function invalidateReceiveSelectOptions(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: receiveSelectOptionsKey });
}

registerCacheChild('mainContracts', invalidateReceiveSelectOptions);

const receiveCrud = createCrudHooks<
  {
    page?: number;
    pageSize?: number;
    receive_status?: string;
    main_contract_id?: number;
    receive_date?: string;
    payer_name?: string;
    keyword?: string;
    contract_name?: string;
  },
  API.Receive
>({
  listQueryKey: 'receives',
  detailQueryKey: 'receive',
  api: {
    list: getReceiveList,
    get: getReceive,
    add: addReceive,
    update: updateReceive,
    remove: removeReceive,
  },
});

const receiveKeys = {
  receives: receiveCrud.queryKeys.list,
  receive: receiveCrud.queryKeys.detail,
  selectOptions: receiveSelectOptionsKey,
};

export const useReceive = receiveCrud.useDetail;
export const useAddReceive = receiveCrud.useAdd;
export const useUpdateReceive = receiveCrud.useUpdate;
export const useRemoveReceive = receiveCrud.useRemove;

/** 获取选择项（总包合同列表） */
export const useReceiveSelectOptions = () => {
  return useQuery({
    queryKey: receiveKeys.selectOptions,
    queryFn: getReceiveSelectOptions,
  });
};

/** React Query fetchQuery 配置（表单编辑态拉取详情） */
export const fetchReceiveQuery = (id: number) => ({
  queryKey: receiveKeys.receive(id),
  queryFn: () => getReceive(id),
});
