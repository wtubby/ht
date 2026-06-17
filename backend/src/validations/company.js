const Joi = require('joi');
const { idParam, listQuery } = require('./common');

const bankAccountItem = Joi.object().keys({
  id: Joi.number().integer(),
  account_name: Joi.string().max(200).required(),
  account_number: Joi.string().max(30).required(),
  bank_name: Joi.string().max(200).required(),
  is_default: Joi.boolean(),
  account_status: Joi.string().valid('正常', '冻结', '销户'),
  remarks: Joi.string().allow(null, '').max(500),
  key: Joi.any().strip(),
  index: Joi.any().strip(),
  company: Joi.any().strip(),
  company_id: Joi.any().strip(),
  created_by: Joi.any().strip(),
  updated_by: Joi.any().strip(),
  created_at: Joi.any().strip(),
  updated_at: Joi.any().strip(),
});

const companyBody = {
  company_name: Joi.string().max(200),
  company_type: Joi.string().valid('签约单位', '合作单位'),
  company_status: Joi.string().valid('正常', '禁用').messages({
    'any.only': '单位状态无效',
  }),
  credit_code: Joi.string().allow(null, '').max(30),
  legal_person: Joi.string().allow(null, '').max(50),
  reg_capital: Joi.number().min(0).allow(null, ''),
  establish_date: Joi.date().allow(null, ''),
  address: Joi.string().allow(null, '').max(500),
  remarks: Joi.string().allow(null, '').max(500),
};

module.exports = {
  create: {
    body: Joi.object().keys({
      company_name: companyBody.company_name.required().messages({
        'string.empty': '公司名称不能为空',
      }),
      company_type: companyBody.company_type.required(),
      company_status: companyBody.company_status,
      credit_code: companyBody.credit_code,
      legal_person: companyBody.legal_person,
      reg_capital: companyBody.reg_capital,
      establish_date: companyBody.establish_date,
      address: companyBody.address,
      remarks: companyBody.remarks,
      bankAccounts: Joi.array().items(bankAccountItem).optional(),
    }),
  },

  update: {
    params: idParam.params,
    body: Joi.object().keys({
      ...companyBody,
      bankAccounts: Joi.array().items(bankAccountItem).optional(),
    }),
  },

  findOne: idParam,
  remove: idParam,

  list: listQuery,
};
