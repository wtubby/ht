const db = require('../models');
const { createInvoiceService } = require('./invoiceCommon.service');
const { findMainContractsForSelect } = require('./contractSelect.service');
const { syncMainContractStatus } = require('../utils/mainContractStatus');

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

const baseService = createInvoiceService({
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

async function syncMainContractStatusForInvoice(record, previousMainContractId) {
  const nextMainContractId = record.main_contract_id;
  await syncMainContractStatus(nextMainContractId);
  if (previousMainContractId && previousMainContractId !== nextMainContractId) {
    await syncMainContractStatus(previousMainContractId);
  }
}

async function createInvoiceOut(body, userId) {
  const invoiceOut = await baseService.create(body, userId);
  await syncMainContractStatus(invoiceOut.main_contract_id);
  return invoiceOut;
}

async function updateInvoiceOut(id, body, userId) {
  const existing = await InvoiceOut.findByPk(id, { attributes: ['main_contract_id'] });
  const invoiceOut = await baseService.update(id, body, userId);
  await syncMainContractStatusForInvoice(invoiceOut, existing?.main_contract_id);
  return invoiceOut;
}

async function removeInvoiceOut(id) {
  const existing = await InvoiceOut.findByPk(id, { attributes: ['main_contract_id'] });
  const mainContractId = existing?.main_contract_id;

  const result = await baseService.remove(id);

  if (mainContractId) {
    await syncMainContractStatus(mainContractId);
  }

  return result;
}

module.exports = {
  findAllInvoiceOut: baseService.findAll,
  findOneInvoiceOut: baseService.findOne,
  createInvoiceOut,
  updateInvoiceOut,
  removeInvoiceOut,
  getInvoiceOutSelectOptions: baseService.getSelectOptions,
};
