import {
  addInvoiceIn,
  getInvoiceIn,
  getInvoiceIns,
  getInvoiceInSelectOptions,
  removeInvoiceIn,
  updateInvoiceIn,
} from '@/services/wtu/invoiceIn.api';
import {
  addInvoiceOut,
  getInvoiceOut,
  getInvoiceOuts,
  getInvoiceOutSelectOptions,
  removeInvoiceOut,
  updateInvoiceOut,
} from '@/services/wtu/invoiceOut.api';
import { useQuery } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { registerCacheChild } from './factories/cacheRelations';
import { createCrudHooks } from './factories/createCrudHooks';

export type InvoiceDirection = 'in' | 'out';

type InvoicePartyCarrier = {
  partyA?: API.Company;
  partyB?: API.Company;
  partyC?: API.Company;
};

const INVOICE_PARTY_MAP: Record<
  InvoiceDirection,
  { buyer: keyof InvoicePartyCarrier; seller: keyof InvoicePartyCarrier }
> = {
  in: { buyer: 'partyB', seller: 'partyC' },
  out: { buyer: 'partyA', seller: 'partyB' },
};

export const resolveInvoiceBuyerSeller = (
  contract: InvoicePartyCarrier,
  direction: InvoiceDirection,
) => {
  const map = INVOICE_PARTY_MAP[direction];
  return {
    buyer: contract[map.buyer]?.company_name ?? '',
    seller: contract[map.seller]?.company_name ?? '',
  };
};

const invoiceInSelectOptionsKey = ['invoiceInSelectOptions'] as const;
const invoiceOutSelectOptionsKey = ['invoiceOutSelectOptions'] as const;

function invalidateInvoiceInSelectOptions(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: invoiceInSelectOptionsKey });
}

function invalidateInvoiceOutSelectOptions(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: invoiceOutSelectOptionsKey });
}

registerCacheChild('subContracts', invalidateInvoiceInSelectOptions);
registerCacheChild('mainContracts', invalidateInvoiceOutSelectOptions);

const invoiceInCrud = createCrudHooks<
  {
    page?: number;
    pageSize?: number;
    search?: string;
    invoice_no?: string;
    sub_contract_id?: number;
    buyer?: string;
    seller?: string;
    invoice_date?: string;
  },
  API.InvoiceIn
>({
  listQueryKey: 'invoiceIns',
  detailQueryKey: 'invoiceIn',
  api: {
    list: getInvoiceIns,
    get: getInvoiceIn,
    add: addInvoiceIn,
    update: updateInvoiceIn,
    remove: removeInvoiceIn,
  },
  invalidateRelated: invalidateInvoiceInSelectOptions,
});

const invoiceOutCrud = createCrudHooks<
  {
    page?: number;
    pageSize?: number;
    search?: string;
    invoice_no?: string;
    buyer?: string;
    seller?: string;
    invoice_date?: string;
  },
  API.InvoiceOut
>({
  listQueryKey: 'invoiceOuts',
  detailQueryKey: 'invoiceOut',
  api: {
    list: getInvoiceOuts,
    get: getInvoiceOut,
    add: addInvoiceOut,
    update: updateInvoiceOut,
    remove: removeInvoiceOut,
  },
  invalidateRelated: invalidateInvoiceOutSelectOptions,
});

const invoiceInKeys = {
  invoiceIns: invoiceInCrud.queryKeys.list,
  invoiceIn: invoiceInCrud.queryKeys.detail,
  selectOptions: invoiceInSelectOptionsKey,
};

const invoiceOutKeys = {
  invoiceOuts: invoiceOutCrud.queryKeys.list,
  invoiceOut: invoiceOutCrud.queryKeys.detail,
  selectOptions: invoiceOutSelectOptionsKey,
};

export const useInvoiceIn = invoiceInCrud.useDetail;
export const useAddInvoiceIn = invoiceInCrud.useAdd;
export const useUpdateInvoiceIn = invoiceInCrud.useUpdate;
export const useRemoveInvoiceIn = invoiceInCrud.useRemove;

export const useInvoiceOut = invoiceOutCrud.useDetail;
export const useAddInvoiceOut = invoiceOutCrud.useAdd;
export const useUpdateInvoiceOut = invoiceOutCrud.useUpdate;
export const useRemoveInvoiceOut = invoiceOutCrud.useRemove;

/** 获取进项发票表单选择项（分包合同列表） */
export const useInvoiceInSelectOptions = (params?: { search?: string; limit?: number }) => {
  return useQuery({
    queryKey: [...invoiceInKeys.selectOptions, params] as const,
    queryFn: () => getInvoiceInSelectOptions(params),
  });
};

/** 获取销项发票表单选择项（总包合同列表） */
export const useInvoiceOutSelectOptions = (params?: { search?: string; limit?: number }) => {
  return useQuery({
    queryKey: [...invoiceOutKeys.selectOptions, params] as const,
    queryFn: () => getInvoiceOutSelectOptions(params),
  });
};

/** React Query fetchQuery 配置（表单编辑态拉取详情） */
export const fetchInvoiceInQuery = (id: number) => ({
  queryKey: invoiceInKeys.invoiceIn(id),
  queryFn: () => getInvoiceIn(id),
});

/** React Query fetchQuery 配置（内嵌关联列表 / 命令式拉列表） */
export const fetchInvoiceInsQuery = (params: Parameters<typeof getInvoiceIns>[0]) => ({
  queryKey: invoiceInKeys.invoiceIns(params),
  queryFn: () => getInvoiceIns(params),
});

export const fetchInvoiceOutQuery = (id: number) => ({
  queryKey: invoiceOutKeys.invoiceOut(id),
  queryFn: () => getInvoiceOut(id),
});
