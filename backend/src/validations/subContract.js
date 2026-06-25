const Joi = require('joi');
const { idParam, listQuery } = require('./common');

const CONTRACT_STATUS = ['未签约', '执行中', '已完工', '已完结'];
const CONTRACT_TYPE = ['专业分包', '劳务分包', '其他服务', '材料采购'];
const BOND_FORM_HINT = ['现金', '保函', '不限'];

const subContractBody = {
  contract_name: Joi.string().max(500),
  main_contract_id: Joi.number().integer(),
  contract_type: Joi.string().valid(...CONTRACT_TYPE),
  contract_status: Joi.string().valid(...CONTRACT_STATUS).messages({
    'any.only': '合同状态无效',
  }),
  party_b_id: Joi.number().integer(),
  party_c_id: Joi.number().integer(),
  amount_contract: Joi.number().min(0).precision(2),
  amount_settlement: Joi.number().min(0).precision(2).allow(null, ''),
  date_signed: Joi.date().allow(null, ''),
  remarks: Joi.string().allow(null, '').max(500),
  bond_perf_req: Joi.boolean(),
  bond_labor_req: Joi.boolean(),
  bond_perf_amt: Joi.number().min(0).precision(2).allow(null, ''),
  bond_labor_amt: Joi.number().min(0).precision(2).allow(null, ''),
  bond_perf_form: Joi.string().valid(...BOND_FORM_HINT).allow(null, ''),
  bond_labor_form: Joi.string().valid(...BOND_FORM_HINT).allow(null, ''),
};

const subContractCreateOrUpdateBody = Joi.object().keys({
  contract_name: subContractBody.contract_name.required().messages({
    'string.empty': '合同名称不能为空',
  }),
  main_contract_id: subContractBody.main_contract_id.required(),
  contract_type: subContractBody.contract_type.required(),
  contract_status: subContractBody.contract_status,
  party_b_id: subContractBody.party_b_id.required(),
  party_c_id: subContractBody.party_c_id.required(),
  amount_contract: subContractBody.amount_contract.required(),
  amount_settlement: subContractBody.amount_settlement,
  date_signed: subContractBody.date_signed,
  remarks: subContractBody.remarks,
  bond_perf_req: subContractBody.bond_perf_req,
  bond_labor_req: subContractBody.bond_labor_req,
  bond_perf_amt: subContractBody.bond_perf_amt,
  bond_labor_amt: subContractBody.bond_labor_amt,
  bond_perf_form: subContractBody.bond_perf_form,
  bond_labor_form: subContractBody.bond_labor_form,
});

module.exports = {
  create: {
    body: subContractCreateOrUpdateBody,
  },

  update: {
    params: idParam.params,
    body: subContractCreateOrUpdateBody,
  },

  findOne: idParam,
  remove: idParam,

  list: listQuery,
};
