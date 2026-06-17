const { createInvoiceValidation } = require('./common');

module.exports = createInvoiceValidation({
  contractField: 'sub_contract_id',
  contractRequiredMessage: '分包合同ID不能为空',
});
