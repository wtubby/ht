// @ts-ignore
/* eslint-disable */
import { apiDelete, apiGet, apiPost, apiPut } from './client';

/** 获取销项发票列表 GET /api/invoice-out */
export async function getInvoiceOuts(
  params: {
    page?: number;
    pageSize?: number;
    search?: string;
    invoice_no?: string;
    main_contract_id?: number;
    buyer?: string;
    seller?: string;
    invoice_date?: string;
  },
  options?: { [key: string]: any },
) {
  return apiGet<{
    success: boolean;
    data: API.InvoiceOut[];
    total: number;
    message?: string;
  }>('/api/invoice-out', params, options);
}

/** 获取单个销项发票 GET /api/invoice-out/:id */
export async function getInvoiceOut(id: number, options?: { [key: string]: any }) {
  return apiGet<{
    success: boolean;
    data: API.InvoiceOut;
    message?: string;
  }>(`/api/invoice-out/${id}`, undefined, options);
}

/** 创建销项发票 POST /api/invoice-out */
export async function addInvoiceOut(data: API.InvoiceOut, options?: { [key: string]: any }) {
  return apiPost<{
    success: boolean;
    data: API.InvoiceOut;
    message?: string;
  }>('/api/invoice-out', data, options);
}

/** 更新销项发票 PUT /api/invoice-out/:id */
export async function updateInvoiceOut(
  id: number,
  data: API.InvoiceOut,
  options?: { [key: string]: any },
) {
  return apiPut<{
    success: boolean;
    data: API.InvoiceOut;
    message?: string;
  }>(`/api/invoice-out/${id}`, data, options);
}

/** 删除销项发票 DELETE /api/invoice-out/:id */
export async function removeInvoiceOut(id: number, options?: { [key: string]: any }) {
  return apiDelete<Record<string, any>>(`/api/invoice-out/${id}`, options);
}

/** 获取选择项(总包合同列表) GET /api/invoice-out/select-options */
export async function getSelectOptions(
  params?: {
    search?: string;
    limit?: number;
  },
  options?: { [key: string]: any },
) {
  return apiGet<{
    success: boolean;
    data: {
      mainContracts: API.MainContract[];
    };
  }>('/api/invoice-out/select-options', params, options);
}

export { ocrInvoice } from './ocr.api';
