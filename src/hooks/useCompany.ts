import { getBankAccounts } from '@/services/wtu/bankAccount.api';
import {
  addCompany,
  getCompanies,
  getCompany,
  removeCompany,
  updateCompany,
} from '@/services/wtu/company.api';
import { useQuery } from '@tanstack/react-query';
import { createCrudHooks } from './factories/createCrudHooks';

type CompanyPayload = API.Company & { bankAccounts?: API.CompanyBankAccount[] };

const companyCrud = createCrudHooks<
  {
    page?: number;
    pageSize?: number;
    company_name?: string;
    company_type?: string;
    company_status?: string;
  },
  CompanyPayload
>({
  listQueryKey: 'companies',
  detailQueryKey: 'company',
  api: {
    list: getCompanies,
    get: getCompany,
    add: addCompany,
    update: updateCompany,
    remove: removeCompany,
  },
  onUpdateSuccess: (queryClient, variables) => {
    queryClient.invalidateQueries({ queryKey: ['companyBankAccounts', variables.id] });
  },
});

export const companyKeys = {
  companies: companyCrud.queryKeys.list,
  company: companyCrud.queryKeys.detail,
  bankAccounts: (companyId: number) => ['companyBankAccounts', companyId] as const,
};

export const useCompany = companyCrud.useDetail;
export const useAddCompany = companyCrud.useAdd;
export const useUpdateCompany = companyCrud.useUpdate;
export const useRemoveCompany = companyCrud.useRemove;

/** 获取指定单位的银行账户列表（与 CompanyBankSection / 收付款表单共用缓存） */
export const useCompanyBankAccounts = (
  companyId: number | null | undefined,
  options?: { enabled?: boolean },
) => {
  const enabled = !!companyId && companyId > 0 && (options?.enabled ?? true);

  return useQuery({
    queryKey: companyKeys.bankAccounts(companyId!),
    queryFn: async ({ signal }) => {
      const response = await getBankAccounts(companyId!, { signal });
      if (!response.success) {
        throw new Error('获取银行账户失败');
      }
      return response.data ?? [];
    },
    enabled,
  });
};

/** React Query fetchQuery 配置（表单编辑态拉取详情） */
export const fetchCompanyQuery = (id: number) => ({
  queryKey: companyKeys.company(id),
  queryFn: () => getCompany(id),
});
