const db = require('../models');
const ApiError = require('../utils/ApiError');
const ERROR_CODES = require('../utils/errorCodes');

const {
  Payment,
  SubContract,
  MainContract,
  Company,
  InvoiceIn,
  InvoiceOut,
  Receive,
} = db;

const paymentInclude = [
  {
    model: SubContract,
    as: 'subContract',
    attributes: ['id', 'contract_name', 'contract_type', 'amount_contract'],
    include: [
      {
        model: MainContract,
        as: 'mainContract',
        attributes: ['id', 'contract_name', 'amount_contract', 'party_a_id', 'party_b_id'],
        include: [
          { model: Company, as: 'partyA', attributes: ['id', 'company_name'] },
          { model: Company, as: 'partyB', attributes: ['id', 'company_name'] },
        ],
      },
      { model: Company, as: 'partyB', attributes: ['id', 'company_name'] },
      { model: Company, as: 'partyC', attributes: ['id', 'company_name'] },
    ],
  },
];

const subContractDetailInclude = [
  { model: Company, as: 'partyB', attributes: ['id', 'company_name'] },
  { model: Company, as: 'partyC', attributes: ['id', 'company_name'] },
];

/**
 * 获取工程款支付申请表数据
 */
async function getApplicationData(paymentId) {
  const payment = await Payment.findByPk(paymentId, {
    attributes: [
      'id',
      'payment_date',
      'payment_amount',
      'sub_contract_id',
      'main_contract_id',
      'account_name',
      'bank_name',
      'account_number',
      'remarks',
    ],
    include: paymentInclude,
  });

  if (!payment) {
    throw new ApiError(404, '付款记录不存在', ERROR_CODES.RESOURCE_NOT_FOUND);
  }

  if (!payment.main_contract_id) {
    throw new ApiError(400, '该付款记录未关联主合同,无法生成支付申请表', ERROR_CODES.VALIDATION_ERROR);
  }

  const mainContractId = payment.main_contract_id;

  const currentSubContract = await SubContract.findByPk(payment.sub_contract_id, {
    attributes: ['id', 'contract_name', 'contract_type', 'amount_contract'],
    include: subContractDetailInclude,
  });

  if (!currentSubContract) {
    throw new ApiError(404, '找不到对应的分包合同', ERROR_CODES.RESOURCE_NOT_FOUND);
  }

  const mainContract = await MainContract.findByPk(mainContractId, {
    attributes: ['id', 'contract_name', 'amount_contract', 'party_a_id', 'party_b_id'],
    include: [
      { model: Company, as: 'partyA', attributes: ['id', 'company_name'] },
      { model: Company, as: 'partyB', attributes: ['id', 'company_name'] },
    ],
  });

  if (!mainContract) {
    throw new ApiError(404, '主合同不存在', ERROR_CODES.RESOURCE_NOT_FOUND);
  }

  const allSubContracts = [currentSubContract];

  const mainContractReceives = await Receive.findAll({
    where: { main_contract_id: mainContractId },
    attributes: ['id', 'receive_amount', 'receive_date'],
    order: [['receive_date', 'ASC']],
  });

  const mainContractTotalReceived = mainContractReceives.reduce(
    (sum, receive) => sum + (parseFloat(receive.receive_amount) || 0),
    0,
  );

  const mainContractInvoices = await InvoiceOut.findAll({
    where: { main_contract_id: mainContractId },
    attributes: ['id', 'invoice_amount', 'invoice_date'],
    order: [['invoice_date', 'ASC']],
  });

  const invoiceResult = await InvoiceOut.findOne({
    where: { main_contract_id: mainContractId },
    attributes: [
      [db.sequelize.fn('COALESCE', db.sequelize.fn('SUM', db.sequelize.col('invoice_amount')), 0), 'total'],
    ],
    raw: true,
  });

  const subContractsWithPayments = await Promise.all(
    allSubContracts.map(async (subContract) => {
      const paymentResult = await Payment.findOne({
        where: { sub_contract_id: subContract.id },
        attributes: [
          [db.sequelize.fn('COALESCE', db.sequelize.fn('SUM', db.sequelize.col('payment_amount')), 0), 'total'],
        ],
        raw: true,
      });

      const invoiceInResult = await InvoiceIn.findOne({
        where: { sub_contract_id: subContract.id },
        attributes: [
          [db.sequelize.fn('COALESCE', db.sequelize.fn('SUM', db.sequelize.col('invoice_amount')), 0), 'total'],
        ],
        raw: true,
      });

      return {
        ...subContract.toJSON(),
        total_paid: parseFloat(paymentResult?.total || 0),
        total_invoiced: parseFloat(invoiceInResult?.total || 0),
      };
    }),
  );

  const receivesByOrder = mainContractReceives
    .slice(0, 4)
    .map((r) => parseFloat(r.receive_amount) || 0);

  const summary = {
    total_contract_amount: subContractsWithPayments.reduce(
      (sum, c) => sum + (c.amount_contract || 0),
      0,
    ),
    total_paid_amount: subContractsWithPayments.reduce(
      (sum, c) => sum + (c.total_paid || 0),
      0,
    ),
  };

  const mainContractTotalInvoiced = parseFloat(invoiceResult?.total || 0);

  return {
    payment: payment.toJSON(),
    mainContract: {
      id: mainContract.id,
      contract_name: mainContract.contract_name,
      amount_contract: mainContract.amount_contract,
      total_received: mainContractTotalReceived,
      total_invoiced: mainContractTotalInvoiced,
      receives: mainContractReceives,
      receivesByOrder,
      invoices: mainContractInvoices,
      partyA: mainContract.partyA,
      partyB: mainContract.partyB,
    },
    allSubContracts: subContractsWithPayments,
    summary,
    currentSubContract: {
      id: currentSubContract.id,
      contract_name: currentSubContract.contract_name,
      contract_type: currentSubContract.contract_type,
      amount_contract: currentSubContract.amount_contract,
    },
  };
}

module.exports = {
  getApplicationData,
};
