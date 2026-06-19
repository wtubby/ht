import type { Rule } from 'antd/es/form';

/** 与后端 receive create body 必填项保持一致；receive_status 前端默认必选 */
export const RECEIVE_REQUIRED_FIELDS = [
  'main_contract_id',
  'receive_date',
  'receive_amount',
  'receive_status',
  'payer_name',
  'payee_name',
] as const;

const maxLengthRule = (max: number, label: string): Rule => ({
  max,
  message: `${label}不能超过${max}个字符`,
});

export const receiveFieldRules = {
  main_contract_id: [{ required: true, message: '请选择总包合同' }],
  receive_date: [{ required: true, message: '请选择收款日期' }],
  receive_status: [{ required: true, message: '请选择收款状态' }],
  receive_amount: [{ required: true, message: '请输入收款金额' }],
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

export const isReceiveRequiredFilled = (
  values: Partial<Record<(typeof RECEIVE_REQUIRED_FIELDS)[number], unknown>>,
) => {
  const hasAmount = values.receive_amount !== undefined && values.receive_amount !== null;
  return !!(
    values.main_contract_id &&
    values.receive_date &&
    hasAmount &&
    values.receive_status &&
    values.payer_name &&
    values.payee_name
  );
};

/** 剔除仅用于表单的辅助字段 */
export const cleanReceiveSubmitData = (
  data: Partial<API.Receive> & Record<string, unknown>,
): API.Receive => {
  const rest = { ...data };
  delete rest.payee_bank_account_select;
  delete rest.payee_bank_account_id;
  delete rest.contract_amount;
  return rest as API.Receive;
};
