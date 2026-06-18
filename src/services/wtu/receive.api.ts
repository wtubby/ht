import { apiDelete, apiGet, apiPost, apiPut } from './client';

/** 获取收款列表 GET /api/receives */
export async function getReceiveList(
  params: {
    page?: number;
    pageSize?: number;
    receive_status?: string;
    main_contract_id?: number;
    receive_date?: string;
    payer_name?: string;
    keyword?: string;
    contract_name?: string;
  },
  options?: { [key: string]: any },
) {
  return apiGet<API.ReceiveList>('/api/receives', params, options);
}

/** 获取单个收款详情 GET /api/receives/:id */
export async function getReceive(id: number, options?: { [key: string]: any }) {
  return apiGet<{
    success: boolean;
    data: API.Receive;
  }>(`/api/receives/${id}`, undefined, options);
}

/** 新建收款 POST /api/receives */
export async function addReceive(data: API.Receive, options?: { [key: string]: any }) {
  return apiPost<{
    success: boolean;
    data: API.Receive;
  }>('/api/receives', data, options);
}

/** 更新收款 PUT /api/receives/:id */
export async function updateReceive(
  id: number,
  data: API.Receive,
  options?: { [key: string]: any },
) {
  return apiPut<{
    success: boolean;
    data: API.Receive;
    message?: string;
  }>(`/api/receives/${id}`, data, options);
}

/** 删除收款 DELETE /api/receives/:id */
export async function removeReceive(id: number, options?: { [key: string]: any }) {
  return apiDelete<Record<string, any>>(`/api/receives/${id}`, options);
}

/** 获取选择项（总包合同列表） GET /api/receives/select-options */
export async function getReceiveSelectOptions(options?: { [key: string]: any }) {
  return apiGet<{
    success: boolean;
    data: {
      mainContracts: API.MainContract[];
    };
  }>('/api/receives/select-options', undefined, options);
}
