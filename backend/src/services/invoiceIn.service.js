const db = require('../models');
const { createInvoiceService } = require('./invoiceCommon.service');
const { findSubContractsForSelect } = require('./contractSelect.service');

const { InvoiceIn, SubContract, User, MainContract } = db;

const FILE_MODULE = 'FB_INVOICE';

const subContractInclude = {
  model: SubContract,
  as: 'subContract',
  attributes: ['id', 'contract_name', 'contract_status', 'main_contract_id', 'amount_contract'],
};

const creatorInclude = {
  model: User,
  as: 'creator',
  attributes: ['id', 'full_name'],
};

const INVOICE_IN_WRITABLE_FIELDS = [
  'invoice_no',
  'invoice_amount',
  'sub_contract_id',
  'buyer',
  'seller',
  'invoice_date',
  'tax_rate',
  'remarks',
];

const service = createInvoiceService({
  model: InvoiceIn,
  contractModel: SubContract,
  contractField: 'sub_contract_id',
  contractSearchPath: '$subContract.contract_name$',
  listInclude: [
    {
      ...subContractInclude,
      include: [{
        model: MainContract,
        as: 'mainContract',
        attributes: ['id', 'contract_name'],
      }],
    },
    creatorInclude,
  ],
  detailInclude: [
    {
      ...subContractInclude,
      include: [{
        model: MainContract,
        as: 'mainContract',
        attributes: ['id', 'contract_name', 'contract_status', 'amount_contract'],
      }],
    },
    creatorInclude,
  ],
  fileModule: FILE_MODULE,
  notFoundMessage: '进项发票不存在',
  contractNotFoundMessage: '关联的分包合同不存在',
  selectOptionsResolver: findSubContractsForSelect,
  writableFields: INVOICE_IN_WRITABLE_FIELDS,
});

module.exports = {
  findAllInvoiceIn: service.findAll,
  findOneInvoiceIn: service.findOne,
  createInvoiceIn: service.create,
  updateInvoiceIn: service.update,
  removeInvoiceIn: service.remove,
  getInvoiceInSelectOptions: service.getSelectOptions,
};
