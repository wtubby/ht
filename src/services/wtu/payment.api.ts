import { apiDelete, apiGet, apiPost, apiPut } from './client';

/** 获取付款列表 GET /api/payments */
export async function getPayments(
  params: {
    page?: number;
    pageSize?: number;
    sub_contract_id?: number;
    payment_date?: string;
    payer_name?: string;
    payee_name?: string;
    contract_name?: string;
  },
  options?: { [key: string]: any },
) {
  return apiGet<API.PaymentList>('/api/payments', params, options);
}

/** 获取单个付款详情 GET /api/payments/:id */
export async function getPayment(id: number, options?: { [key: string]: any }) {
  return apiGet<{
    success: boolean;
    data: API.Payment;
  }>(`/api/payments/${id}`, undefined, options);
}

/** 新建付款 POST /api/payments */
export async function addPayment(data: API.Payment, options?: { [key: string]: any }) {
  return apiPost<{ success: boolean; data: API.Payment }>('/api/payments', data, options);
}

/** 更新付款 PUT /api/payments/:id */
export async function updatePayment(
  id: number,
  data: API.Payment,
  options?: { [key: string]: any },
) {
  return apiPut<{ success: boolean; data: API.Payment; message?: string }>(
    `/api/payments/${id}`,
    data,
    options,
  );
}

/** 删除付款 DELETE /api/payments/:id */
export async function removePayment(id: number, options?: { [key: string]: any }) {
  return apiDelete<Record<string, any>>(`/api/payments/${id}`, options);
}

/** 获取选择项（分包合同列表） GET /api/payments/select-options */
export async function getSelectOptions(options?: { [key: string]: any }) {
  return apiGet<{
    success: boolean;
    data: {
      subContracts: API.SubContract[];
    };
  }>('/api/payments/select-options', undefined, options);
}
