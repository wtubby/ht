// @ts-ignore
/* eslint-disable */
import { apiDelete, apiGet, apiPost, apiPut } from './client';

/** 获取进项发票列表 GET /api/invoice-in */
export async function getInvoiceIns(
  params: {
    page?: number;
    pageSize?: number;
    search?: string;
    invoice_no?: string;
    sub_contract_id?: number;
    buyer?: string;
    seller?: string;
    invoice_date?: string;
  },
  options?: { [key: string]: any },
) {
  return apiGet<{
    success: boolean;
    data: API.InvoiceIn[];
    total: number;
    message?: string;
  }>('/api/invoice-in', params, options);
}

/** 获取单个进项发票 GET /api/invoice-in/:id */
export async function getInvoiceIn(id: number, options?: { [key: string]: any }) {
  return apiGet<{
    success: boolean;
    data: API.InvoiceIn;
    message?: string;
  }>(`/api/invoice-in/${id}`, undefined, options);
}

/** 创建进项发票 POST /api/invoice-in */
export async function addInvoiceIn(data: API.InvoiceIn, options?: { [key: string]: any }) {
  return apiPost<{
    success: boolean;
    data: API.InvoiceIn;
    message?: string;
  }>('/api/invoice-in', data, options);
}

/** 更新进项发票 PUT /api/invoice-in/:id */
export async function updateInvoiceIn(
  id: number,
  data: API.InvoiceIn,
  options?: { [key: string]: any },
) {
  return apiPut<{
    success: boolean;
    data: API.InvoiceIn;
    message?: string;
  }>(`/api/invoice-in/${id}`, data, options);
}

/** 删除进项发票 DELETE /api/invoice-in/:id */
export async function removeInvoiceIn(id: number, options?: { [key: string]: any }) {
  return apiDelete<Record<string, any>>(`/api/invoice-in/${id}`, options);
}

/** 获取选择项(分包合同列表) GET /api/invoice-in/select-options */
export async function getInvoiceInSelectOptions(
  params?: {
    search?: string;
    limit?: number;
  },
  options?: { [key: string]: any },
) {
  return apiGet<{
    success: boolean;
    data: {
      subContracts: API.SubContract[];
    };
  }>('/api/invoice-in/select-options', params, options);
}

export { ocrInvoice } from './ocr.api';
