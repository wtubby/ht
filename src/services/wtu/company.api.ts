import { apiDelete, apiGet, apiPost, apiPut } from './client';

/** 获取单位列表 GET /api/companies */
export async function getCompanies(
  params: {
    page?: number;
    pageSize?: number;
    company_name?: string;
    company_type?: string;
    company_status?: string;
  },
  options?: { [key: string]: any },
) {
  return apiGet<API.CompanyList>('/api/companies', params, options);
}

/** 获取单个单位详情 GET /api/companies/:id */
export async function getCompany(id: number, options?: { [key: string]: any }) {
  return apiGet<{ success: boolean; data: API.Company }>(`/api/companies/${id}`, undefined, options);
}

/** 新建单位 POST /api/companies（bankAccounts 与单位信息同一事务提交） */
export async function addCompany(
  data: API.Company & { bankAccounts?: API.CompanyBankAccount[] },
  options?: { [key: string]: any },
) {
  return apiPost<{ success: boolean; data: API.Company }>('/api/companies', data, options);
}

/** 更新单位 PUT /api/companies/:id（bankAccounts 与单位信息同一事务提交） */
export async function updateCompany(
  id: number,
  data: API.Company & { bankAccounts?: API.CompanyBankAccount[] },
  options?: { [key: string]: any },
) {
  return apiPut<{ success: boolean; data: API.Company; message?: string }>(
    `/api/companies/${id}`,
    data,
    options,
  );
}

/** 删除单位 DELETE /api/companies/:id */
export async function removeCompany(id: number, options?: { [key: string]: any }) {
  return apiDelete<{ success: boolean }>(`/api/companies/${id}`, options);
}
