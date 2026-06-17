const Joi = require('joi');
const { idParam, companyIdParam } = require('./common');

const bankAccountBody = {
  account_name: Joi.string().max(200),
  account_number: Joi.string().max(30),
  bank_name: Joi.string().max(200),
  is_default: Joi.boolean(),
  account_status: Joi.string().valid('正常', '冻结', '销户'),
  remarks: Joi.string().allow(null, '').max(500),
};

module.exports = {
  create: {
    params: companyIdParam.params,
    body: Joi.object().keys({
      account_name: bankAccountBody.account_name.required().messages({
        'string.empty': '账户名称不能为空',
      }),
      account_number: bankAccountBody.account_number.required().messages({
        'string.empty': '账户号码不能为空',
      }),
      bank_name: bankAccountBody.bank_name.required().messages({
        'string.empty': '开户银行不能为空',
      }),
      is_default: bankAccountBody.is_default,
      account_status: bankAccountBody.account_status,
      remarks: bankAccountBody.remarks,
    }),
  },

  update: {
    params: idParam.params,
    body: Joi.object().keys(bankAccountBody),
  },

  remove: idParam,
  setDefault: idParam,
  listByCompany: companyIdParam,
};
