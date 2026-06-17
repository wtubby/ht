/** 与后端 subContractCreateOrUpdateBody 必填项保持一致 */
export const SUB_CONTRACT_REQUIRED_FIELDS = [
  'contract_name',
  'main_contract_id',
  'contract_type',
  'party_b_id',
  'party_c_id',
  'amount_contract',
] as const;

export const subContractFieldRules = {
  contract_name: [{ required: true, message: '请输入分包合同名称' }],
  main_contract_id: [{ required: true, message: '请选择总包合同' }],
  contract_type: [{ required: true, message: '请选择合同类型' }],
  party_b_id: [{ required: true, message: '请选择承包单位' }],
  party_c_id: [{ required: true, message: '请选择分包单位' }],
  amount_contract: [{ required: true, message: '请输入合同金额' }],
};

export const BOND_FORM_HINT_OPTIONS = [
  { label: '现金', value: '现金' as const },
  { label: '保函', value: '保函' as const },
  { label: '不限', value: '不限' as const },
];

export const normalizeSubContractValues = (values: API.SubContract): API.SubContract => {
  const bond_perf_req = !!values.bond_perf_req;
  const bond_labor_req = !!values.bond_labor_req;

  return {
    ...values,
    amount_settlement: values.amount_settlement ?? undefined,
    bond_perf_req,
    bond_labor_req,
    bond_perf_amt: bond_perf_req ? values.bond_perf_amt : undefined,
    bond_labor_amt: bond_labor_req ? values.bond_labor_amt : undefined,
    bond_perf_form: bond_perf_req ? values.bond_perf_form : undefined,
    bond_labor_form: bond_labor_req ? values.bond_labor_form : undefined,
  };
};

export const isSubContractRequiredFilled = (
  values: Partial<Record<(typeof SUB_CONTRACT_REQUIRED_FIELDS)[number], unknown>>,
) => {
  const hasAmount = values.amount_contract !== undefined && values.amount_contract !== null;
  return !!(
    values.contract_name &&
    values.main_contract_id &&
    values.contract_type &&
    values.party_b_id &&
    values.party_c_id &&
    hasAmount
  );
};
