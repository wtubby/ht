import type { Rule } from 'antd/es/form';

/** 与后端 payment create body 必填项保持一致 */
export const PAYMENT_REQUIRED_FIELDS = [
  'sub_contract_id',
  'payment_date',
  'payment_amount',
  'payer_name',
  'payee_name',
] as const;

const maxLengthRule = (max: number, label: string): Rule => ({
  max,
  message: `${label}不能超过${max}个字符`,
});

export const paymentFieldRules = {
  sub_contract_id: [{ required: true, message: '请选择分包合同' }],
  payment_date: [{ required: true, message: '请选择付款日期' }],
  payment_amount: [{ required: true, message: '请输入付款金额' }],
  payer_name: [
    { required: true, message: '请输入付款方名称' },
    maxLengthRule(200, '付款方名称'),
  ],
  payee_name: [
    { required: true, message: '请输入收款方名称' },
    maxLengthRule(200, '收款方名称'),
  ],
  account_name: [maxLengthRule(200, '账户名称')],
  account_number: [maxLengthRule(30, '银行账号')],
  bank_name: [maxLengthRule(200, '开户银行')],
  remarks: [maxLengthRule(500, '备注')],
};

export const isPaymentRequiredFilled = (
  values: Partial<Record<(typeof PAYMENT_REQUIRED_FIELDS)[number], unknown>>,
) => {
  const hasAmount = values.payment_amount !== undefined && values.payment_amount !== null;
  return !!(
    values.sub_contract_id &&
    values.payment_date &&
    hasAmount &&
    values.payer_name &&
    values.payee_name
  );
};

/** 剔除仅用于表单的辅助字段 */
export const cleanPaymentSubmitData = (data: Record<string, unknown>): API.Payment => {
  const rest = { ...data };
  delete rest.contract_amount;
  delete rest.payee_bank_account_select;
  delete rest.payee_bank_account_id;
  return rest as API.Payment;
};
