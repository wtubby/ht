const Joi = require('joi');
const { idParam, listQuery } = require('./common');

const paymentBody = {
  payment_amount: Joi.number().min(0),
  sub_contract_id: Joi.number().integer(),
  payer_name: Joi.string().max(200),
  payee_name: Joi.string().max(200),
  account_name: Joi.string().allow(null, '').max(200),
  account_number: Joi.string().allow(null, '').max(30),
  bank_name: Joi.string().allow(null, '').max(200),
  payment_date: Joi.date(),
  remarks: Joi.string().allow(null, '').max(500),
};

module.exports = {
  create: {
    body: Joi.object().keys({
      payment_amount: paymentBody.payment_amount.required(),
      sub_contract_id: paymentBody.sub_contract_id.required(),
      // main_contract_id 由 service 根据 sub_contract_id 推导，创建时无需传入
      payer_name: paymentBody.payer_name.required(),
      payee_name: paymentBody.payee_name.required(),
      account_name: paymentBody.account_name,
      account_number: paymentBody.account_number,
      bank_name: paymentBody.bank_name,
      payment_date: paymentBody.payment_date.required(),
      remarks: paymentBody.remarks,
    }),
  },

  update: {
    params: idParam.params,
    body: Joi.object().keys(paymentBody),
  },

  findOne: idParam,
  remove: idParam,
  list: listQuery,
};
