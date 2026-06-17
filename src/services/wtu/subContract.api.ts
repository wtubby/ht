import { apiDelete, apiGet, apiPost, apiPut } from './client';

/** 获取分包合同列表 GET /api/sub-contracts */
export async function getSubContracts(
  params: {
    page?: number;
    pageSize?: number;
    contract_status?: string;
    contract_type?: string;
    main_contract_id?: number;
    party_b_id?: number;
    party_c_id?: number;
    contract_name?: string;
  },
  options?: { [key: string]: any },
) {
  return apiGet<API.SubContractList>('/api/sub-contracts', params, options);
}

/** 获取单个分包合同详情 GET /api/sub-contracts/:id */
export async function getSubContract(id: number, options?: { [key: string]: any }) {
  return apiGet<{ success: boolean; data: API.SubContract; message?: string }>(
    `/api/sub-contracts/${id}`,
    undefined,
    options,
  );
}

/** 新建分包合同 POST /api/sub-contracts */
export async function addSubContract(data: API.SubContract, options?: { [key: string]: any }) {
  return apiPost<API.SubContract>('/api/sub-contracts', data, options);
}

/** 更新分包合同 PUT /api/sub-contracts/:id */
export async function updateSubContract(
  id: number,
  data: API.SubContract,
  options?: { [key: string]: any },
) {
  return apiPut<{ success: boolean; data: API.SubContract; message?: string }>(
    `/api/sub-contracts/${id}`,
    data,
    options,
  );
}

/** 删除分包合同 DELETE /api/sub-contracts/:id */
export async function removeSubContract(id: number, options?: { [key: string]: any }) {
  return apiDelete<Record<string, any>>(`/api/sub-contracts/${id}`, options);
}

/** 获取选择项（总包合同和单位列表） GET /api/sub-contracts/select-options */
export async function getSelectOptions(options?: { [key: string]: any }) {
  return apiGet<{
    success: boolean;
    data: {
      mainContracts: API.MainContract[];
      partyB: API.Company[];
      partyC: API.Company[];
    };
  }>('/api/sub-contracts/select-options', undefined, options);
}
