import { useCompanyBankAccounts } from '@/hooks/useCompany';
import {
  filterSelectableAccounts,
  findDefaultSelectableAccount,
} from '@/utils/companyBankAccount';
import type { ProFormInstance } from '@ant-design/pro-components';
import { useCallback, useEffect, useMemo, useState, type MutableRefObject, type RefObject } from 'react';

export const PARTY_BANK_ACCOUNT_FIELDS = {
  select: 'payee_bank_account_select',
  accountName: 'account_name',
  accountNumber: 'account_number',
  bankName: 'bank_name',
} as const;

/** 清空合同切换时的银行账户辅助字段 */
export const getEmptyPartyBankAccountFieldValues = () => ({
  [PARTY_BANK_ACCOUNT_FIELDS.select]: undefined,
  [PARTY_BANK_ACCOUNT_FIELDS.accountName]: undefined,
  [PARTY_BANK_ACCOUNT_FIELDS.accountNumber]: undefined,
  [PARTY_BANK_ACCOUNT_FIELDS.bankName]: undefined,
});

const toBankAccountFieldValues = (account: API.CompanyBankAccount) => ({
  [PARTY_BANK_ACCOUNT_FIELDS.select]: account.id,
  [PARTY_BANK_ACCOUNT_FIELDS.accountName]: account.account_name,
  [PARTY_BANK_ACCOUNT_FIELDS.accountNumber]: account.account_number,
  [PARTY_BANK_ACCOUNT_FIELDS.bankName]: account.bank_name,
});

interface UsePartyBankAccountAutoFillOptions {
  visible: boolean;
  formRef: RefObject<ProFormInstance | undefined>;
  hydratingRef: MutableRefObject<boolean>;
}

/**
 * 收付款表单：按单位加载银行账户，并在切换合同时自动填入默认账户。
 */
export function usePartyBankAccountAutoFill({
  visible,
  formRef,
  hydratingRef,
}: UsePartyBankAccountAutoFillOptions) {
  const [partyCompanyId, setPartyCompanyId] = useState<number | null>(null);
  const [autoFillCompanyId, setAutoFillCompanyId] = useState<number | null>(null);

  const { data: bankAccounts = [] } = useCompanyBankAccounts(partyCompanyId, {
    enabled: visible && !!partyCompanyId,
  });

  const availableBankAccounts = useMemo(
    () => filterSelectableAccounts(bankAccounts),
    [bankAccounts],
  );

  const applyBankAccountToForm = useCallback(
    (account: API.CompanyBankAccount) => {
      hydratingRef.current = true;
      try {
        formRef.current?.setFieldsValue(toBankAccountFieldValues(account));
      } finally {
        hydratingRef.current = false;
      }
    },
    [formRef, hydratingRef],
  );

  const requestPartyBankAccounts = useCallback(
    (companyId: number | null | undefined, autoFillDefault?: boolean) => {
      if (!companyId) {
        setAutoFillCompanyId(null);
        setPartyCompanyId(null);
        return;
      }
      setAutoFillCompanyId(autoFillDefault ? companyId : null);
      setPartyCompanyId(companyId);
    },
    [],
  );

  const resetPartyBankAccounts = useCallback(() => {
    setPartyCompanyId(null);
    setAutoFillCompanyId(null);
  }, []);

  useEffect(() => {
    if (autoFillCompanyId == null) return;
    if (partyCompanyId !== autoFillCompanyId) return;
    if (bankAccounts.length === 0) return;

    const defaultAccount = findDefaultSelectableAccount(bankAccounts);
    setAutoFillCompanyId(null);
    if (defaultAccount) {
      applyBankAccountToForm(defaultAccount);
    }
  }, [bankAccounts, autoFillCompanyId, partyCompanyId, applyBankAccountToForm]);

  return {
    partyCompanyId,
    setPartyCompanyId,
    bankAccounts,
    availableBankAccounts,
    requestPartyBankAccounts,
    resetPartyBankAccounts,
    applyBankAccountToForm,
  };
}
