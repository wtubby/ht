const Joi = require('joi');
const { idParam, listQuery } = require('./common');

const CONTRACT_STATUS = ['未签约', '执行中', '已完工', '已完结'];

const mainContractBody = {
  contract_name: Joi.string().max(500),
  contract_no: Joi.string().allow(null, '').max(50),
  contract_status: Joi.string().valid(...CONTRACT_STATUS).messages({
    'any.only': '合同状态无效',
  }),
  party_a_id: Joi.number().integer(),
  party_b_id: Joi.number().integer(),
  amount_contract: Joi.number().min(0).precision(2),
  amount_settlement: Joi.number().min(0).precision(2).allow(null, ''),
  date_signed: Joi.date().allow(null, ''),
  warranty_years: Joi.number().min(0).max(999.9).precision(1).allow(null, ''),
  date_warranty: Joi.date().allow(null, ''),
  date_start: Joi.date().allow(null, ''),
  date_end: Joi.date().allow(null, ''),
  remarks: Joi.string().allow(null, '').max(500),
};

const mainContractCreateOrUpdateBody = Joi.object().keys({
  contract_name: mainContractBody.contract_name.required().messages({
    'string.empty': '合同名称不能为空',
  }),
  contract_no: mainContractBody.contract_no,
  contract_status: mainContractBody.contract_status.strip(),
  party_a_id: mainContractBody.party_a_id.required(),
  party_b_id: mainContractBody.party_b_id.required(),
  amount_contract: mainContractBody.amount_contract.required(),
  amount_settlement: mainContractBody.amount_settlement,
  date_signed: mainContractBody.date_signed,
  warranty_years: mainContractBody.warranty_years,
  date_warranty: mainContractBody.date_warranty,
  date_start: mainContractBody.date_start,
  date_end: mainContractBody.date_end,
  remarks: mainContractBody.remarks,
});

module.exports = {
  create: {
    body: mainContractCreateOrUpdateBody,
  },

  update: {
    params: idParam.params,
    body: mainContractCreateOrUpdateBody,
  },

  findOne: idParam,
  remove: idParam,

  list: listQuery,
};
