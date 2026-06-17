import { apiDelete, apiGet, apiPost, apiPut } from './client';

/** 获取总包合同列表 GET /api/main-contracts */
export async function getMainContracts(
  params: {
    page?: number;
    pageSize?: number;
    contract_name?: string;
    contract_status?: string;
    party_a_id?: number;
    party_b_id?: number;
  },
  options?: { [key: string]: any },
) {
  return apiGet<API.MainContractList>('/api/main-contracts', params, options);
}

/** 获取单个总包合同详情 GET /api/main-contracts/:id */
export async function getMainContract(id: number, options?: { [key: string]: any }) {
  return apiGet<API.MainContract>(`/api/main-contracts/${id}`, undefined, options);
}

/** 获取总包合同详情页关联数据 GET /api/main-contracts/:id/related */
export async function getMainContractRelated(id: number, options?: { [key: string]: any }) {
  return apiGet<{
    success: boolean;
    data: {
      receives: API.Receive[];
      invoiceOuts: API.InvoiceOut[];
      subContracts: API.SubContract[];
      files: API.File[];
      subContractStats: Record<number, { paymentTotal: number; invoiceTotal: number }>;
    };
  }>(`/api/main-contracts/${id}/related`, undefined, options);
}

/** 新建总包合同 POST /api/main-contracts */
export async function addMainContract(data: API.MainContract, options?: { [key: string]: any }) {
  return apiPost<API.MainContract>('/api/main-contracts', data, options);
}

/** 更新总包合同 PUT /api/main-contracts/:id */
export async function updateMainContract(
  id: number,
  data: API.MainContract,
  options?: { [key: string]: any },
) {
  return apiPut<{ success: boolean; data: API.MainContract; message?: string }>(
    `/api/main-contracts/${id}`,
    data,
    options,
  );
}

/** 删除总包合同 DELETE /api/main-contracts/:id */
export async function removeMainContract(id: number, options?: { [key: string]: any }) {
  return apiDelete<Record<string, any>>(`/api/main-contracts/${id}`, options);
}

/** 获取单位列表（用于表单选择） GET /api/main-contracts/select-options */
export async function getSelectOptions(options?: { [key: string]: any }) {
  return apiGet<{
    success: boolean;
    data: {
      partyA: API.Company[];
      partyB: API.Company[];
    };
  }>('/api/main-contracts/select-options', undefined, options);
}
