const db = require('../models');
const { Op } = require('sequelize');
const ApiError = require('../utils/ApiError');
const ERROR_CODES = require('../utils/errorCodes');
const { attachFileStatus, checkFileStatus } = require('../utils/fileStatusHelper');
const { cleanupFiles } = require('../utils/fileCleanup');
const { resolveListPagination } = require('../utils/listPagination');

const {
  MainContract,
  SubContract,
  Company,
  User,
  Receive,
  InvoiceOut,
  Payment,
} = db;

const FILE_MODULE = 'ZB_CONTRACT';

const contractIncludes = [
  { model: Company, as: 'partyA', attributes: ['id', 'company_name', 'company_type'] },
  { model: Company, as: 'partyB', attributes: ['id', 'company_name', 'company_type'] },
  { model: User, as: 'creator', attributes: ['id', 'username', 'full_name'] },
];

function buildListWhere(query) {
  const { contract_name, contract_status, party_a_id, party_b_id } = query;
  const condition = {};

  if (contract_name) {
    condition.contract_name = { [Op.like]: `%${contract_name}%` };
  }
  if (contract_status && contract_status.trim()) {
    condition.contract_status = contract_status.trim();
  }
  if (party_a_id) condition.party_a_id = party_a_id;
  if (party_b_id) condition.party_b_id = party_b_id;

  return condition;
}

async function findMainContractWithRelations(id) {
  return MainContract.findByPk(id, { include: contractIncludes });
}

/**
 * 创建总包合同
 */
async function createMainContract(body, userId) {
  const mainContract = await MainContract.create({
    ...body,
    created_by: userId,
  });

  return findMainContractWithRelations(mainContract.id);
}

/**
 * 获取总包合同列表
 */
async function findAllMainContracts(query) {
  const { pageSize, offset } = resolveListPagination(query);
  const condition = buildListWhere(query);

  const total = await MainContract.count({ where: condition });
  const mainContracts = await MainContract.findAll({
    where: condition,
    limit: pageSize,
    offset,
    order: [['date_signed', 'DESC'], ['id', 'DESC']],
    include: contractIncludes,
  });

  const contractIds = mainContracts.map(c => c.id);

  const receiveTotals = await Receive.findAll({
    where: { main_contract_id: { [Op.in]: contractIds } },
    attributes: [
      'main_contract_id',
      [db.sequelize.fn('COALESCE', db.sequelize.fn('SUM', db.sequelize.col('receive_amount')), 0), 'total_received'],
    ],
    group: ['main_contract_id'],
    raw: true,
  });

  const invoiceOutTotals = await InvoiceOut.findAll({
    where: { main_contract_id: { [Op.in]: contractIds } },
    attributes: [
      'main_contract_id',
      [db.sequelize.fn('COALESCE', db.sequelize.fn('SUM', db.sequelize.col('invoice_amount')), 0), 'total_invoiced'],
    ],
    group: ['main_contract_id'],
    raw: true,
  });

  const receiveMap = new Map();
  receiveTotals.forEach(item => {
    receiveMap.set(item.main_contract_id, parseFloat(item.total_received) || 0);
  });

  const invoiceOutMap = new Map();
  invoiceOutTotals.forEach(item => {
    invoiceOutMap.set(item.main_contract_id, parseFloat(item.total_invoiced) || 0);
  });

  const contractsWithTotals = mainContracts.map(contract => ({
    ...contract.toJSON(),
    total_received: receiveMap.get(contract.id) || 0,
    total_invoiced: invoiceOutMap.get(contract.id) || 0,
  }));

  await attachFileStatus(contractsWithTotals, FILE_MODULE);

  return { data: contractsWithTotals, total };
}

/**
 * 获取单个总包合同
 */
async function findOneMainContract(id) {
  const mainContract = await findMainContractWithRelations(id);
  if (!mainContract) {
    throw new ApiError(404, '主合同不存在', ERROR_CODES.RESOURCE_NOT_FOUND);
  }

  const data = mainContract.toJSON();
  data.has_files = await checkFileStatus(FILE_MODULE, id);
  return data;
}

/**
 * 更新总包合同
 */
async function updateMainContract(id, body, userId) {
  const [num] = await MainContract.update(
    { ...body, updated_by: userId },
    { where: { id } },
  );

  if (num !== 1) {
    throw new ApiError(404, '主合同不存在', ERROR_CODES.RESOURCE_NOT_FOUND);
  }

  return findMainContractWithRelations(id);
}

async function getMainContractRelatedCounts(id) {
  const [
    subContractCount,
    receiveCount,
    invoiceOutCount,
    paymentCount,
  ] = await Promise.all([
    SubContract.count({ where: { main_contract_id: id } }),
    Receive.count({ where: { main_contract_id: id } }),
    InvoiceOut.count({ where: { main_contract_id: id } }),
    Payment.count({ where: { main_contract_id: id } }),
  ]);

  return {
    subContractCount,
    receiveCount,
    invoiceOutCount,
    paymentCount,
  };
}

function buildDeleteBlockedMessage(counts) {
  const parts = [];

  if (counts.subContractCount > 0) {
    parts.push(`分包合同 ${counts.subContractCount} 条`);
  }
  if (counts.receiveCount > 0) {
    parts.push(`收款记录 ${counts.receiveCount} 条`);
  }
  if (counts.invoiceOutCount > 0) {
    parts.push(`销项发票 ${counts.invoiceOutCount} 条`);
  }
  if (counts.paymentCount > 0) {
    parts.push(`付款记录 ${counts.paymentCount} 条`);
  }

  return parts.join('、');
}

/**
 * 删除总包合同（仅允许无业务关联数据时删除，并清理本合同附件）
 */
async function removeMainContract(id) {
  const mainContract = await MainContract.findByPk(id);
  if (!mainContract) {
    throw new ApiError(404, '主合同不存在', ERROR_CODES.RESOURCE_NOT_FOUND);
  }

  const relatedCounts = await getMainContractRelatedCounts(id);
  const blockedDetail = buildDeleteBlockedMessage(relatedCounts);
  if (blockedDetail) {
    throw new ApiError(
      409,
      `存在关联数据，无法删除：${blockedDetail}。请先清理相关数据后再试。`,
      ERROR_CODES.CONTRACT_HAS_RELATED_DATA,
    );
  }

  const t = await db.sequelize.transaction();

  try {
    const deletedFilesCount = await cleanupFiles({ main_contract_id: id }, t);
    await mainContract.destroy({ transaction: t });
    await t.commit();

    return { deletedFilesCount };
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

/**
 * 获取总包合同表单选择项
 */
async function getMainContractSelectOptions() {
  const partyACompanies = await Company.findAll({
    where: { company_type: '合作单位', company_status: '正常' },
    attributes: ['id', 'company_name', 'company_type'],
    order: [['company_name', 'ASC']],
  });

  const partyBCompanies = await Company.findAll({
    where: { company_type: '签约单位', company_status: '正常' },
    attributes: ['id', 'company_name', 'company_type'],
    order: [['company_name', 'ASC']],
  });

  return { partyA: partyACompanies, partyB: partyBCompanies };
}

module.exports = {
  createMainContract,
  findAllMainContracts,
  findOneMainContract,
  updateMainContract,
  removeMainContract,
  getMainContractSelectOptions,
};
