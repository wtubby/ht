const { createInvoiceValidation } = require('./common');

module.exports = createInvoiceValidation({
  contractField: 'main_contract_id',
  contractRequiredMessage: '总包合同ID不能为空',
});
