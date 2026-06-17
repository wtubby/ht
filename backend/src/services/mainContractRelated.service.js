const db = require('../models');
const { Op } = require('sequelize');
const ApiError = require('../utils/ApiError');
const ERROR_CODES = require('../utils/errorCodes');
const { attachFileStatus } = require('../utils/fileStatusHelper');

const {
  MainContract,
  SubContract,
  Company,
  User,
  Receive,
  InvoiceOut,
  Payment,
  InvoiceIn,
  File,
} = db;

const FILE_MODULE = 'ZB_CONTRACT';

const receiveListInclude = {
  model: MainContract,
  as: 'mainContract',
  attributes: ['id', 'contract_name', 'amount_contract', 'contract_status'],
  include: [
    { model: Company, as: 'partyA', attributes: ['id', 'company_name'] },
    { model: Company, as: 'partyB', attributes: ['id', 'company_name'] },
  ],
};

const invoiceOutListInclude = {
  model: MainContract,
  as: 'mainContract',
  attributes: ['id', 'contract_name', 'contract_status'],
};

const invoiceOutCreatorInclude = {
  model: User,
  as: 'creator',
  attributes: ['id', 'full_name'],
};

const subContractRelatedIncludes = [
  { model: Company, as: 'partyB', attributes: ['id', 'company_name', 'company_type'] },
  { model: Company, as: 'partyC', attributes: ['id', 'company_name', 'company_type'] },
];

/**
 * 总包合同详情页关联数据（收款/销项/分包/附件 + 分包付款进项汇总）
 */
async function findMainContractRelated(id) {
  const mainContract = await MainContract.findByPk(id);
  if (!mainContract) {
    throw new ApiError(404, '主合同不存在', ERROR_CODES.RESOURCE_NOT_FOUND);
  }

  const [receives, invoiceOuts, subContractRows, files] = await Promise.all([
    Receive.findAll({
      where: { main_contract_id: id },
      order: [['receive_date', 'DESC']],
      include: [receiveListInclude],
    }),
    InvoiceOut.findAll({
      where: { main_contract_id: id },
      order: [['invoice_date', 'DESC'], ['id', 'DESC']],
      include: [invoiceOutListInclude, invoiceOutCreatorInclude],
    }),
    SubContract.findAll({
      where: { main_contract_id: id },
      order: [['date_signed', 'DESC']],
      include: subContractRelatedIncludes,
    }),
    File.findAll({
      where: { file_module: FILE_MODULE, main_contract_id: id },
      order: [['uploaded_at', 'DESC']],
    }),
  ]);

  const contractIds = subContractRows.map(c => c.id);
  const subContractStats = {};

  if (contractIds.length > 0) {
    const [paymentTotals, invoiceTotals] = await Promise.all([
      Payment.findAll({
        where: { sub_contract_id: { [Op.in]: contractIds } },
        attributes: [
          'sub_contract_id',
          [db.sequelize.fn('COALESCE', db.sequelize.fn('SUM', db.sequelize.col('payment_amount')), 0), 'total_paid'],
        ],
        group: ['sub_contract_id'],
        raw: true,
      }),
      InvoiceIn.findAll({
        where: { sub_contract_id: { [Op.in]: contractIds } },
        attributes: [
          'sub_contract_id',
          [db.sequelize.fn('COALESCE', db.sequelize.fn('SUM', db.sequelize.col('invoice_amount')), 0), 'total_invoiced'],
        ],
        group: ['sub_contract_id'],
        raw: true,
      }),
    ]);

    const paymentMap = new Map();
    paymentTotals.forEach(item => {
      paymentMap.set(item.sub_contract_id, parseFloat(item.total_paid) || 0);
    });
    const invoiceMap = new Map();
    invoiceTotals.forEach(item => {
      invoiceMap.set(item.sub_contract_id, parseFloat(item.total_invoiced) || 0);
    });

    contractIds.forEach((scId) => {
      subContractStats[scId] = {
        paymentTotal: paymentMap.get(scId) || 0,
        invoiceTotal: invoiceMap.get(scId) || 0,
      };
    });
  }

  const receivesJson = receives.map(r => ({ ...r.toJSON(), has_files: false }));
  const invoiceOutsJson = invoiceOuts.map(i => ({ ...i.toJSON(), has_files: false }));
  await attachFileStatus(receivesJson, 'ZB_RECEIVE');
  await attachFileStatus(invoiceOutsJson, 'ZB_INVOICE');

  return {
    receives: receivesJson,
    invoiceOuts: invoiceOutsJson,
    subContracts: subContractRows.map(c => c.toJSON()),
    files: files.map(f => f.toJSON()),
    subContractStats,
  };
}

module.exports = {
  findMainContractRelated,
};
