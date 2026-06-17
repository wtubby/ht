import { apiDelete, apiGet, apiPost, apiPut } from './client';

type BankAccount = API.CompanyBankAccount;
type BankAccountList = API.CompanyBankAccountList;
type BankAccountMutationResponse = {
  success: boolean;
  data: BankAccount;
  message?: string;
};

/** 获取指定公司的银行账号列表 GET /api/companies/:companyId/bank-accounts */
export async function getBankAccounts(companyId: number, options?: { [key: string]: any }) {
  return apiGet<BankAccountList>(`/api/companies/${companyId}/bank-accounts`, undefined, options);
}

/** 为指定公司新建银行账号 POST /api/companies/:companyId/bank-accounts */
export async function addBankAccount(
  companyId: number,
  data: BankAccount,
  options?: { [key: string]: any },
) {
  return apiPost<BankAccountMutationResponse>(
    `/api/companies/${companyId}/bank-accounts`,
    data,
    options,
  );
}

/** 更新银行账号 PUT /api/bank-accounts/:id */
export async function updateBankAccount(
  id: number,
  data: BankAccount,
  options?: { [key: string]: any },
) {
  return apiPut<BankAccountMutationResponse>(`/api/bank-accounts/${id}`, data, options);
}

/** 删除银行账号 DELETE /api/bank-accounts/:id */
export async function removeBankAccount(id: number, options?: { [key: string]: any }) {
  return apiDelete<Record<string, any>>(`/api/bank-accounts/${id}`, options);
}

/** 设置为默认账号 PUT /api/bank-accounts/:id/set-default */
export async function setDefaultBankAccount(id: number, options?: { [key: string]: any }) {
  return apiPut<Record<string, any>>(`/api/bank-accounts/${id}/set-default`, undefined, options);
}
