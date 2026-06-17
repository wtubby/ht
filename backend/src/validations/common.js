const Joi = require('joi');
const { TAX_RATES } = require('../constants/taxRate');

const id = Joi.number().integer().required().messages({
  'number.base': 'ID必须是数字',
  'any.required': 'ID不能为空',
});

const listQuery = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  // 实际上限由 service 层 resolveListPagination 控制：无筛选 max 100，有筛选 max 1000
  pageSize: Joi.number().integer().min(1).max(1000).default(10),
  search: Joi.string().allow('').optional(),
}).unknown(true);

function createInvoiceValidation({ contractField, contractRequiredMessage }) {
  const invoiceBody = {
    invoice_no: Joi.string().max(50).min(1).messages({
      'string.empty': '发票号码不能为空',
    }),
    // 红冲可为负数；DECIMAL(15,2) 已兼容
    invoice_amount: Joi.number().precision(2),
    [contractField]: Joi.number().integer(),
    buyer: Joi.string().max(200),
    seller: Joi.string().max(200),
    invoice_date: Joi.date(),
    tax_rate: Joi.number().integer().valid(...TAX_RATES).allow(null, ''),
    remarks: Joi.string().allow(null, '').max(500),
  };

  return {
    create: {
      body: Joi.object().keys({
        invoice_no: invoiceBody.invoice_no.required(),
        invoice_amount: invoiceBody.invoice_amount.required().messages({
          'number.base': '发票金额必须是数字',
          'any.required': '发票金额不能为空',
        }),
        [contractField]: invoiceBody[contractField].required().messages({
          'any.required': contractRequiredMessage,
        }),
        buyer: invoiceBody.buyer.required().messages({
          'string.empty': '购买方不能为空',
        }),
        seller: invoiceBody.seller.required().messages({
          'string.empty': '销售方不能为空',
        }),
        invoice_date: invoiceBody.invoice_date.required().messages({
          'date.base': '发票日期格式错误',
          'any.required': '发票日期不能为空',
        }),
        tax_rate: invoiceBody.tax_rate,
        remarks: invoiceBody.remarks,
      }),
    },
    update: {
      params: Joi.object({ id }),
      body: Joi.object().keys(invoiceBody),
    },
    findOne: {
      params: Joi.object({ id }),
    },
    remove: {
      params: Joi.object({ id }),
    },
    list: {
      query: listQuery,
    },
  };
}

module.exports = {
  idParam: {
    params: Joi.object({ id }),
  },

  companyIdParam: {
    params: Joi.object({
      companyId: id.messages({ 'any.required': '公司ID不能为空' }),
    }),
  },

  paymentIdParam: {
    params: Joi.object({
      paymentId: id.messages({ 'any.required': '付款ID不能为空' }),
    }),
  },

  listQuery: {
    query: listQuery,
  },
  createInvoiceValidation,
};
