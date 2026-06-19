const Joi = require('joi');
const { idParam, listQuery } = require('./common');

const receiveBody = {
  receive_amount: Joi.number().min(0),
  main_contract_id: Joi.number().integer(),
  payer_name: Joi.string().max(200),
  payee_name: Joi.string().max(200),
  account_name: Joi.string().allow(null, '').max(200),
  bank_name: Joi.string().allow(null, '').max(200),
  account_number: Joi.string().allow(null, '').max(30),
  receive_date: Joi.date(),
  receive_status: Joi.string().valid('待确认', '已确认').messages({
    'any.only': '收款状态无效',
  }),
  remarks: Joi.string().allow(null, '').max(500),
};

module.exports = {
  create: {
    body: Joi.object().keys({
      receive_amount: receiveBody.receive_amount.required(),
      main_contract_id: receiveBody.main_contract_id.required(),
      payer_name: receiveBody.payer_name.required(),
      payee_name: receiveBody.payee_name.required(),
      account_name: receiveBody.account_name,
      bank_name: receiveBody.bank_name,
      account_number: receiveBody.account_number,
      receive_date: receiveBody.receive_date.required(),
      receive_status: receiveBody.receive_status,
      remarks: receiveBody.remarks,
    }),
  },

  update: {
    params: idParam.params,
    body: Joi.object().keys(receiveBody),
  },

  findOne: idParam,
  remove: idParam,
  list: listQuery,
};
