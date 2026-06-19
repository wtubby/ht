const db = require('../models');
const { Op } = require('sequelize');
const ApiError = require('../utils/ApiError');
const ERROR_CODES = require('../utils/errorCodes');
const { attachFileStatus, checkFileStatus } = require('../utils/fileStatusHelper');
const { removeRecordWithFiles } = require('../utils/recordRemoval');
const { resolveListPagination } = require('../utils/listPagination');
const { findSubContractsForSelect } = require('./contractSelect.service');

const { Payment, SubContract, MainContract, Company } = db;

const FILE_MODULE = 'FB_PAYMENT';

function getPaymentIncludes(subContractCondition = {}) {
  const hasSubContractFilter = Object.keys(subContractCondition).length > 0;

  return [{
    model: SubContract,
    as: 'subContract',
    required: true,
    attributes: ['id', 'contract_name', 'contract_status', 'contract_type', 'amount_contract', 'amount_settlement'],
    where: hasSubContractFilter ? subContractCondition : undefined,
    include: [
      {
        model: MainContract,
        as: 'mainContract',
        attributes: ['id', 'contract_name', 'amount_contract'],
        include: [
          { model: Company, as: 'partyA', attributes: ['id', 'company_name'] },
          { model: Company, as: 'partyB', attributes: ['id', 'company_name'] },
        ],
      },
      { model: Company, as: 'partyB', attributes: ['id', 'company_name'] },
      { model: Company, as: 'partyC', attributes: ['id', 'company_name'] },
    ],
  }];
}

async function resolveMainContractId(subContractId) {
  const subContract = await SubContract.findByPk(subContractId, {
    attributes: ['main_contract_id'],
  });
  if (!subContract) {
    throw new ApiError(404, '分包合同不存在', ERROR_CODES.CONTRACT_NOT_FOUND);
  }
  return subContract.main_contract_id;
}

function buildListWhere(query) {
  const {
    sub_contract_id,
    payment_date,
    payer_name,
    payee_name,
    contract_name,
  } = query;

  const condition = {};
  const subContractCondition = {};

  if (sub_contract_id) {
    condition.sub_contract_id = sub_contract_id;
  }
  if (payment_date) condition.payment_date = payment_date;
  if (payer_name) condition.payer_name = { [Op.like]: `%${payer_name}%` };
  if (payee_name) condition.payee_name = { [Op.like]: `%${payee_name}%` };
  if (contract_name) {
    subContractCondition.contract_name = { [Op.like]: `%${contract_name}%` };
  }

  return { condition, subContractCondition };
}

async function findPaymentWithRelations(id) {
  return Payment.findByPk(id, { include: getPaymentIncludes() });
}

async function attachTotalPaid(data) {
  const subContractId = data.sub_contract_id;
  if (!subContractId) return data;

  const paymentTotals = await Payment.findAll({
    where: { sub_contract_id: subContractId },
    attributes: [
      [db.sequelize.fn('COALESCE', db.sequelize.fn('SUM', db.sequelize.col('payment_amount')), 0), 'total_paid'],
    ],
    raw: true,
  });
  data.total_paid = parseFloat(paymentTotals[0]?.total_paid || 0);
  return data;
}

async function buildPaymentDetail(id) {
  const payment = await findPaymentWithRelations(id);
  if (!payment) {
    throw new ApiError(404, '付款记录不存在', ERROR_CODES.RESOURCE_NOT_FOUND);
  }

  const data = payment.toJSON();
  await attachTotalPaid(data);
  data.has_files = await checkFileStatus(FILE_MODULE, id);
  return data;
}

const PAYMENT_WRITABLE_FIELDS = [
  'payment_amount',
  'sub_contract_id',
  'payer_name',
  'payee_name',
  'account_name',
  'account_number',
  'bank_name',
  'payment_date',
  'remarks',
];

/**
 * 创建付款
 */
async function createPayment(body, userId) {
  const mainContractId = await resolveMainContractId(body.sub_contract_id);

  const data = {
    main_contract_id: mainContractId,
    created_by: userId,
  };
  for (const key of PAYMENT_WRITABLE_FIELDS) {
    data[key] = body[key];
  }

  const payment = await Payment.create(data);

  return buildPaymentDetail(payment.id);
}

/**
 * 获取付款列表
 */
async function findAllPayments(query) {
  const { pageSize, offset } = resolveListPagination(query);
  const { condition, subContractCondition } = buildListWhere(query);

  const { count, rows } = await Payment.findAndCountAll({
    where: condition,
    limit: pageSize,
    offset,
    order: [['payment_date', 'DESC'], ['id', 'DESC']],
    include: getPaymentIncludes(subContractCondition),
  });

  const paymentsWithFiles = rows.map(payment => ({ ...payment.toJSON(), has_files: false }));
  await attachFileStatus(paymentsWithFiles, FILE_MODULE);

  return { data: paymentsWithFiles, total: count };
}

/**
 * 获取单个付款
 */
async function findOnePayment(id) {
  return buildPaymentDetail(id);
}

/**
 * 更新付款
 */
async function updatePayment(id, body, userId) {
  const updates = { updated_by: userId };
  for (const key of PAYMENT_WRITABLE_FIELDS) {
    if (body[key] !== undefined) {
      updates[key] = body[key];
    }
  }
  if (body.sub_contract_id !== undefined) {
    updates.main_contract_id = await resolveMainContractId(body.sub_contract_id);
  }

  const [num] = await Payment.update(updates, { where: { id } });
  if (num !== 1) {
    throw new ApiError(404, '付款记录不存在', ERROR_CODES.RESOURCE_NOT_FOUND);
  }

  return buildPaymentDetail(id);
}

/**
 * 删除付款（含关联文件清理）
 */
async function removePayment(id) {
  return removeRecordWithFiles({
    model: Payment,
    id,
    fileModule: FILE_MODULE,
    notFoundMessage: '付款记录不存在',
  });
}

/**
 * 获取付款表单选择项
 */
async function getPaymentSelectOptions() {
  return findSubContractsForSelect();
}

module.exports = {
  createPayment,
  findAllPayments,
  findOnePayment,
  updatePayment,
  removePayment,
  getPaymentSelectOptions,
};
