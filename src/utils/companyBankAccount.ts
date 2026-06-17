/** 银行账户：表单编辑行、校验、下拉展示等共享逻辑 */

export const BANK_ACCOUNT_STATUSES = ['正常', '冻结', '销户'] as const;
export type BankAccountStatus = (typeof BANK_ACCOUNT_STATUSES)[number];

/** 表单/卡片下拉可切换的状态（不含销户） */
export const BANK_ACCOUNT_EDIT_STATUSES = ['正常', '冻结'] as const;
export type BankAccountEditStatus = (typeof BANK_ACCOUNT_EDIT_STATUSES)[number];

export const BANK_ACCOUNT_DEFAULT_STATUS: BankAccountEditStatus = '正常';

export const BANK_ACCOUNT_EDIT_STATUS_OPTIONS = [
  { label: '正常', value: '正常' },
  { label: '冻结', value: '冻结' },
] as const;

/** 新建单位时首个账户仅允许正常状态 */
export const BANK_ACCOUNT_FIRST_STATUS_OPTIONS = [
  { label: '正常', value: '正常' },
] as const;

export type EditableBankAccount = API.CompanyBankAccount & {
  key: string;
};

const BANK_ACCOUNT_API_KEYS = [
  'id',
  'account_name',
  'account_number',
  'bank_name',
  'is_default',
  'account_status',
  'remarks',
] as const;

export const normalizeBankText = (value?: string) => (value ?? '').trim();

export const isDefaultBankAccount = (account: API.CompanyBankAccount) =>
  account.is_default === true || account.is_default === 1;

/** 付款/收款/退保证金等场景可选账户 */
export const isSelectableBankAccount = (account: API.CompanyBankAccount) =>
  !account.account_status || account.account_status === BANK_ACCOUNT_DEFAULT_STATUS;

export const filterSelectableAccounts = (accounts: API.CompanyBankAccount[]) =>
  accounts.filter(isSelectableBankAccount);

export const findDefaultSelectableAccount = (accounts: API.CompanyBankAccount[]) =>
  accounts.find((account) => isSelectableBankAccount(account) && isDefaultBankAccount(account));

export const maskBankAccountNumber = (accountNumber?: string) => {
  const value = normalizeBankText(accountNumber);
  if (!value) return '-';
  if (value.length <= 8) return value;
  return `${value.slice(0, 4)} **** ${value.slice(-4)}`;
};

export const formatAccountLabel = (account: API.CompanyBankAccount) =>
  `${account.account_name} (${account.account_number}) - ${account.bank_name}${
    isDefaultBankAccount(account) ? ' (默认)' : ''
  }`;

export const createBankAccountRowKey = () =>
  `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;

export const toEditableBankAccount = (account: API.CompanyBankAccount): EditableBankAccount => {
  const rest = { ...account } as API.CompanyBankAccount & { company?: unknown };
  delete rest.company;
  return {
    ...rest,
    is_default: isDefaultBankAccount(account),
    key: account.id ? `existing_${account.id}` : createBankAccountRowKey(),
  };
};

const isBankAccountRowComplete = (account: API.CompanyBankAccount) =>
  !!(
    normalizeBankText(account.account_name) &&
    normalizeBankText(account.account_number) &&
    normalizeBankText(account.bank_name)
  );

const isBankAccountRowPartial = (account: API.CompanyBankAccount) => {
  const filled = [
    normalizeBankText(account.account_name),
    normalizeBankText(account.account_number),
    normalizeBankText(account.bank_name),
  ].filter(Boolean).length;
  return filled > 0 && filled < 3;
};

export const pickBankPayload = (
  account: EditableBankAccount,
  mode: 'add' | 'update',
): API.CompanyBankAccount => {
  const payload = {
    account_name: normalizeBankText(account.account_name),
    account_number: normalizeBankText(account.account_number),
    bank_name: normalizeBankText(account.bank_name),
    is_default: account.is_default,
    account_status: account.account_status,
    remarks: normalizeBankText(account.remarks),
    ...(mode === 'update' && account.id ? { id: account.id } : {}),
  };

  return Object.fromEntries(
    BANK_ACCOUNT_API_KEYS.filter((key) => {
      if (key === 'id' && mode === 'add') return false;
      const value = payload[key as keyof typeof payload];
      return value !== undefined && value !== '';
    }).map((key) => [key, payload[key as keyof typeof payload]]),
  ) as API.CompanyBankAccount;
};

export const pickStatusPayload = (
  account: API.CompanyBankAccount,
  status: BankAccountStatus,
): API.CompanyBankAccount => ({
  account_name: account.account_name,
  account_number: account.account_number,
  bank_name: account.bank_name,
  account_status: status,
  remarks: account.remarks ?? undefined,
  is_default: status === BANK_ACCOUNT_DEFAULT_STATUS ? isDefaultBankAccount(account) : false,
});

export type BankAccountsSubmitResult =
  | { ok: true; data: API.CompanyBankAccount[] }
  | { ok: false; message: string };

/** 校验并产出提交用银行账户列表（模块内） */
const validateBankAccounts = (
  formAccounts: EditableBankAccount[],
  mode: 'add' | 'update',
): BankAccountsSubmitResult => {
  const partialIndex = formAccounts.findIndex(isBankAccountRowPartial);
  if (partialIndex >= 0) {
    return {
      ok: false,
      message: `第 ${partialIndex + 1} 条银行账户信息不完整，请补全后再保存`,
    };
  }

  const completedAccounts = formAccounts.filter(isBankAccountRowComplete);

  const defaultAccounts = completedAccounts.filter(isDefaultBankAccount);
  if (defaultAccounts.length > 1) {
    return { ok: false, message: '只能设置一个默认银行账户' };
  }

  const invalidDefault = defaultAccounts.find(
    (account) =>
      account.account_status && account.account_status !== BANK_ACCOUNT_DEFAULT_STATUS,
  );
  if (invalidDefault) {
    return { ok: false, message: '默认银行账户状态必须为“正常”' };
  }

  const seenAccountNumbers = new Set<string>();
  for (const account of completedAccounts) {
    const accountNumber = normalizeBankText(account.account_number).replace(/\s+/g, '');
    if (accountNumber.length > 30) {
      return {
        ok: false,
        message: '银行账号不能超过30个字符',
      };
    }
    if (seenAccountNumbers.has(accountNumber)) {
      return {
        ok: false,
        message: `银行账号“${account.account_number}”重复，请检查后再保存`,
      };
    }
    seenAccountNumbers.add(accountNumber);
  }

  const keptAccounts = completedAccounts.filter((account) =>
    mode === 'update'
      ? account.id || isBankAccountRowComplete(account)
      : isBankAccountRowComplete(account),
  );

  return {
    ok: true,
    data: keptAccounts.map((account) => pickBankPayload(account, mode)),
  };
};

/** 新建单位时可选的首个银行账户 */
export const buildFirstBankPayload = (
  include: boolean,
  first?: Partial<API.CompanyBankAccount>,
): BankAccountsSubmitResult => {
  if (!include || !first) {
    return { ok: true, data: [] };
  }
  return validateBankAccounts(
    [
      {
        ...first,
        key: createBankAccountRowKey(),
        account_status: first.account_status || BANK_ACCOUNT_DEFAULT_STATUS,
        is_default: first.is_default ?? true,
      } as EditableBankAccount,
    ],
    'add',
  );
};
