import { apiDelete, apiGet, apiPost, apiPut } from './client';

/** 获取担保列表 GET /api/bonds */
export async function getBonds(
  params: {
    page?: number;
    pageSize?: number;
    sub_contract_id?: number;
    bond_type?: string;
    bond_form?: string;
    status?: string;
    search?: string;
    sorter?: string;
  },
  options?: { [key: string]: any },
) {
  return apiGet<API.BondList>('/api/bonds', params, options);
}

/** 获取单个担保详情 GET /api/bonds/:id */
export async function getBond(id: number, options?: { [key: string]: any }) {
  return apiGet<API.BondResponse>(`/api/bonds/${id}`, undefined, options);
}

/** 新建担保 POST /api/bonds */
export async function addBond(data: API.Bond, options?: { [key: string]: any }) {
  return apiPost<API.BondResponse>('/api/bonds', data, options);
}

/** 更新担保 PUT /api/bonds/:id */
export async function updateBond(id: number, data: API.Bond, options?: { [key: string]: any }) {
  return apiPut<API.BondResponse>(`/api/bonds/${id}`, data, options);
}

/** 删除担保 DELETE /api/bonds/:id */
export async function removeBond(id: number, options?: { [key: string]: any }) {
  return apiDelete<Record<string, any>>(`/api/bonds/${id}`, options);
}

/** 退还担保 POST /api/bonds/:id/refund */
export async function refundBond(
  id: number,
  data: {
    date_end: string;
    account_name: string;
    account_number: string;
    bank_name: string;
    remarks?: string;
  },
  options?: { [key: string]: any },
) {
  return apiPost<API.BondResponse>(`/api/bonds/${id}/refund`, data, options);
}

/** 获取选择项（分包合同列表） GET /api/bonds/select-options */
export async function getSelectOptions(
  params?: { only_pending?: boolean },
  options?: { [key: string]: any },
) {
  return apiGet<{
    success: boolean;
    data: {
      subContracts: API.SubContract[];
    };
  }>('/api/bonds/select-options', params, options);
}
