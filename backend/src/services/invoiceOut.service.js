const db = require('../models');
const { createInvoiceService } = require('./invoiceCommon.service');
const { findMainContractsForSelect } = require('./contractSelect.service');

const { InvoiceOut, MainContract, User } = db;

const FILE_MODULE = 'ZB_INVOICE';

const mainContractInclude = {
  model: MainContract,
  as: 'mainContract',
  attributes: ['id', 'contract_name', 'contract_status'],
};

const creatorInclude = {
  model: User,
  as: 'creator',
  attributes: ['id', 'full_name'],
};

const INVOICE_OUT_WRITABLE_FIELDS = [
  'invoice_no',
  'invoice_amount',
  'main_contract_id',
  'buyer',
  'seller',
  'invoice_date',
  'tax_rate',
  'remarks',
];

const service = createInvoiceService({
  model: InvoiceOut,
  contractModel: MainContract,
  contractField: 'main_contract_id',
  contractSearchPath: '$mainContract.contract_name$',
  listInclude: [mainContractInclude, creatorInclude],
  detailInclude: [
    {
      ...mainContractInclude,
      attributes: ['id', 'contract_name', 'contract_status', 'amount_contract'],
    },
    creatorInclude,
  ],
  fileModule: FILE_MODULE,
  notFoundMessage: '销项发票不存在',
  contractNotFoundMessage: '关联的总包合同不存在',
  selectOptionsResolver: findMainContractsForSelect,
  writableFields: INVOICE_OUT_WRITABLE_FIELDS,
  enrichDetail: async (data) => {
    const totalInvoiced = await InvoiceOut.sum('invoice_amount', {
      where: { main_contract_id: data.main_contract_id },
    });
    if (data.mainContract) {
      data.mainContract.total_invoiced = parseFloat(totalInvoiced || 0);
    }
  },
});

module.exports = {
  findAllInvoiceOut: service.findAll,
  findOneInvoiceOut: service.findOne,
  createInvoiceOut: service.create,
  updateInvoiceOut: service.update,
  removeInvoiceOut: service.remove,
  getInvoiceOutSelectOptions: service.getSelectOptions,
};
