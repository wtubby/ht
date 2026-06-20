/** 与后端 mainContractCreateOrUpdateBody 必填项保持一致 */
export const MAIN_CONTRACT_REQUIRED_FIELDS = [
  'contract_name',
  'party_a_id',
  'party_b_id',
  'amount_contract',
] as const;

export const mainContractFieldRules = {
  contract_name: [{ required: true, message: '合同名称为必填项' }],
  party_a_id: [{ required: true, message: '请选择发包单位' }],
  party_b_id: [{ required: true, message: '请选择承包单位' }],
  amount_contract: [{ required: true, message: '合同金额为必填项' }],
};

export const normalizeMainContractValues = (values: API.MainContract): API.MainContract => {
  const { contract_status: _status, ...rest } = values;
  return {
    ...rest,
    amount_settlement:
      values.amount_settlement === undefined || values.amount_settlement === null
        ? undefined
        : values.amount_settlement,
  };
};

export const isMainContractRequiredFilled = (
  values: Partial<Record<(typeof MAIN_CONTRACT_REQUIRED_FIELDS)[number], unknown>>,
) => {
  const hasAmount = values.amount_contract !== undefined && values.amount_contract !== null;
  return !!(values.contract_name && values.party_a_id && values.party_b_id && hasAmount);
};
