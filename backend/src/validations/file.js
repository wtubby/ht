const Joi = require('joi');
const { idParam, listQuery } = require('./common');

const FILE_MODULES = [
  'FB_BOND', 'FB_CONTRACT', 'FB_INVOICE', 'FB_PAYMENT',
  'ZB_CONTRACT', 'ZB_INSPECT', 'ZB_INSURE', 'ZB_INVOICE', 'ZB_RECEIVE',
];

module.exports = {
  uploadDirect: {
    body: Joi.object().keys({
      file_module: Joi.string().valid(...FILE_MODULES).required().messages({
        'any.only': '文件模块类型无效',
        'any.required': '文件模块不能为空',
      }),
      main_contract_id: Joi.number().integer().required().messages({
        'any.required': '总包合同ID不能为空',
      }),
      sub_contract_id: Joi.number().integer().allow(null, ''),
      record_id: Joi.number().integer().allow(null, ''),
    }),
  },

  remove: idParam,
  rename: {
    params: idParam.params,
    body: Joi.object().keys({
      invoice_no: Joi.string().max(50).allow(null, ''),
      seller: Joi.string().max(200).allow(null, ''),
      invoice_date: Joi.string().allow(null, ''),
      invoice_amount: Joi.alternatives().try(Joi.number(), Joi.string()).allow(null, ''),
    }),
  },
  list: listQuery,
};
