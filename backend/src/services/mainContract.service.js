const db = require('../models');
const { Op } = require('sequelize');
const ApiError = require('../utils/ApiError');
const ERROR_CODES = require('../utils/errorCodes');
const { attachFileStatus, checkFileStatus } = require('../utils/fileStatusHelper');
const { cleanupFiles } = require('../utils/fileCleanup');
const { resolveListPagination } = require('../utils/listPagination');
const {
  getMainContractTotals,
  resolveMainContractStatus,
  resolveDateWarrantyOnWrite,
} = require('../utils/mainContractStatus');

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

async function buildMainContractDetail(id) {
  const mainContract = await findMainContractWithRelations(id);
  if (!mainContract) {
    throw new ApiError(404, '主合同不存在', ERROR_CODES.RESOURCE_NOT_FOUND);
  }

  const data = mainContract.toJSON();
  data.has_files = await checkFileStatus(FILE_MODULE, id);
  const totals = await getMainContractTotals(id);
  data.total_received = totals.total_received;
  data.total_invoiced = totals.total_invoiced;
  return data;
}

const MAIN_CONTRACT_WRITABLE_FIELDS = [
  'contract_name',
  'contract_no',
  'party_a_id',
  'party_b_id',
  'amount_contract',
  'amount_settlement',
  'date_signed',
  'warranty_years',
  'date_warranty',
  'date_start',
  'date_end',
  'remarks',
];

/**
 * 创建总包合同
 */
async function createMainContract(body, userId) {
  const data = { created_by: userId };
  for (const key of MAIN_CONTRACT_WRITABLE_FIELDS) {
    data[key] = body[key];
  }
  data.date_warranty = resolveDateWarrantyOnWrite({
    date_end: data.date_end,
    warranty_years: data.warranty_years,
    date_warranty: data.date_warranty,
  });
  data.contract_status = resolveMainContractStatus(data, {
    total_received: 0,
    total_invoiced: 0,
  });

  const mainContract = await MainContract.create(data);

  return buildMainContractDetail(mainContract.id);
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
  return buildMainContractDetail(id);
}

/**
 * 更新总包合同
 */
async function updateMainContract(id, body, userId) {
  const existing = await MainContract.findByPk(id);
  if (!existing) {
    throw new ApiError(404, '主合同不存在', ERROR_CODES.RESOURCE_NOT_FOUND);
  }

  const updates = { updated_by: userId };
  for (const key of MAIN_CONTRACT_WRITABLE_FIELDS) {
    if (body[key] !== undefined) {
      updates[key] = body[key];
    }
  }

  const merged = { ...existing.toJSON(), ...updates };
  updates.date_warranty = resolveDateWarrantyOnWrite({
    date_end: merged.date_end,
    warranty_years: merged.warranty_years,
    date_warranty: body.date_warranty !== undefined ? body.date_warranty : existing.date_warranty,
  });

  const mergedForStatus = { ...merged, date_warranty: updates.date_warranty };
  const totals = await getMainContractTotals(id);
  updates.contract_status = resolveMainContractStatus(mergedForStatus, totals);

  const [num] = await MainContract.update(updates, { where: { id } });

  if (num !== 1) {
    throw new ApiError(404, '主合同不存在', ERROR_CODES.RESOURCE_NOT_FOUND);
  }

  return buildMainContractDetail(id);
}

async function getMainContractRelatedCounts(id, transaction) {
  const countOptions = transaction ? { transaction } : {};
  const [
    subContractCount,
    receiveCount,
    invoiceOutCount,
    paymentCount,
  ] = await Promise.all([
    SubContract.count({ where: { main_contract_id: id }, ...countOptions }),
    Receive.count({ where: { main_contract_id: id }, ...countOptions }),
    InvoiceOut.count({ where: { main_contract_id: id }, ...countOptions }),
    Payment.count({ where: { main_contract_id: id }, ...countOptions }),
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
  const t = await db.sequelize.transaction();

  try {
    const mainContract = await MainContract.findByPk(id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!mainContract) {
      throw new ApiError(404, '主合同不存在', ERROR_CODES.RESOURCE_NOT_FOUND);
    }

    const relatedCounts = await getMainContractRelatedCounts(id, t);
    const blockedDetail = buildDeleteBlockedMessage(relatedCounts);
    if (blockedDetail) {
      throw new ApiError(
        409,
        `存在关联数据，无法删除：${blockedDetail}。请先清理相关数据后再试。`,
        ERROR_CODES.CONTRACT_HAS_RELATED_DATA,
      );
    }

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
