const Joi = require('joi');
const { idParam, listQuery } = require('./common');

const BOND_TYPE = ['履约保证金', '民工保证金'];
const BOND_FORM = ['现金', '保函'];
const BOND_STATUS = ['担保中', '已退还', '已过期'];

const bondBody = {
  sub_contract_id: Joi.number().integer(),
  bond_type: Joi.string().valid(...BOND_TYPE),
  bond_form: Joi.string().valid(...BOND_FORM),
  status: Joi.string().valid(...BOND_STATUS).messages({
    'any.only': '担保状态无效',
  }),
  amount: Joi.number().min(0).allow(null, ''),
  account_name: Joi.string().allow(null, '').max(200),
  account_number: Joi.string().allow(null, '').max(30),
  bank_name: Joi.string().allow(null, '').max(200),
  organization: Joi.string().allow(null, '').max(100),
  date_start: Joi.date().allow(null, ''),
  date_end: Joi.date().allow(null, ''),
  remarks: Joi.string().allow(null, ''),
};

module.exports = {
  create: {
    body: Joi.object().keys({
      sub_contract_id: bondBody.sub_contract_id.required(),
      bond_type: bondBody.bond_type.required(),
      bond_form: bondBody.bond_form.required(),
      status: bondBody.status,
      amount: bondBody.amount,
      account_name: bondBody.account_name,
      account_number: bondBody.account_number,
      bank_name: bondBody.bank_name,
      organization: bondBody.organization,
      date_start: bondBody.date_start,
      date_end: bondBody.date_end,
      remarks: bondBody.remarks,
    }),
  },

  update: {
    params: idParam.params,
    body: Joi.object().keys(bondBody),
  },

  findOne: idParam,
  remove: idParam,
  list: listQuery,

  selectOptions: {
    query: Joi.object({
      only_pending: Joi.boolean().truthy('true').falsy('false'),
    }).unknown(true),
  },

  refund: {
    params: idParam.params,
    body: Joi.object().keys({
      date_end: Joi.date().allow(null, ''),
      account_name: Joi.string().allow(null, '').max(200),
      account_number: Joi.string().allow(null, '').max(30),
      bank_name: Joi.string().allow(null, '').max(200),
      remarks: Joi.string().allow(null, ''),
    }),
  },
};
