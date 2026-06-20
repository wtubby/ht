const db = require('../models');
const { Op } = require('sequelize');
const ApiError = require('../utils/ApiError');
const ERROR_CODES = require('../utils/errorCodes');
const { attachFileStatus, checkFileStatus } = require('../utils/fileStatusHelper');
const { cleanupFiles } = require('../utils/fileCleanup');
const { resolveListPagination } = require('../utils/listPagination');
const { attachBondsDisplayStatus } = require('../utils/bond.helper');

const {
  SubContract,
  MainContract,
  Company,
  User,
  Payment,
  InvoiceIn,
  Bond,
} = db;

const FILE_MODULE = 'FB_CONTRACT';

const bondListAttributes = [
  'id',
  'bond_type',
  'bond_form',
  'status',
  'amount',
  'date_start',
  'date_end',
  'organization',
];

const listIncludes = [
  {
    model: MainContract,
    as: 'mainContract',
    attributes: ['id', 'contract_name', 'contract_status'],
    include: [
      { model: Company, as: 'partyA', attributes: ['id', 'company_name', 'company_type'] },
    ],
  },
  { model: Company, as: 'partyB', attributes: ['id', 'company_name', 'company_type'] },
  { model: Company, as: 'partyC', attributes: ['id', 'company_name', 'company_type'] },
  { model: User, as: 'creator', attributes: ['id', 'username', 'full_name'] },
  { model: Bond, as: 'bonds', attributes: bondListAttributes },
];

const detailIncludes = [
  {
    model: MainContract,
    as: 'mainContract',
    attributes: ['id', 'contract_name', 'contract_status'],
    include: [
      { model: Company, as: 'partyA', attributes: ['id', 'company_name', 'company_type'] },
    ],
  },
  { model: Company, as: 'partyB', attributes: ['id', 'company_name', 'company_type'] },
  { model: Company, as: 'partyC', attributes: ['id', 'company_name', 'company_type'] },
  { model: User, as: 'creator', attributes: ['id', 'username', 'full_name'] },
  {
    model: Bond,
    as: 'bonds',
    attributes: bondListAttributes,
  },
];

function buildListWhere(query) {
  const {
    contract_status,
    contract_type,
    main_contract_id,
    party_b_id,
    party_c_id,
    contract_name,
  } = query;

  const condition = {};
  if (contract_status) condition.contract_status = contract_status;
  if (contract_type) condition.contract_type = contract_type;
  if (main_contract_id) condition.main_contract_id = main_contract_id;
  if (party_b_id) condition.party_b_id = party_b_id;
  if (party_c_id) condition.party_c_id = party_c_id;
  if (contract_name) condition.contract_name = { [Op.like]: `%${contract_name}%` };

  return condition;
}

async function findSubContractWithRelations(id) {
  return SubContract.findByPk(id, { include: detailIncludes });
}

const SUB_CONTRACT_WRITABLE_FIELDS = [
  'contract_name',
  'main_contract_id',
  'contract_type',
  'contract_status',
  'party_b_id',
  'party_c_id',
  'amount_contract',
  'amount_settlement',
  'date_signed',
  'remarks',
  'bond_perf_req',
  'bond_labor_req',
  'bond_perf_amt',
  'bond_labor_amt',
  'bond_perf_form',
  'bond_labor_form',
];

/**
 * 创建分包合同
 */
async function createSubContract(body, userId) {
  const data = { created_by: userId };
  for (const key of SUB_CONTRACT_WRITABLE_FIELDS) {
    data[key] = body[key];
  }

  const subContract = await SubContract.create(data);

  return findSubContractWithRelations(subContract.id);
}

/**
 * 获取分包合同列表
 */
async function findAllSubContracts(query) {
  const { pageSize, offset } = resolveListPagination(query);
  const where = buildListWhere(query);

  const total = await SubContract.count({ where });
  const rows = await SubContract.findAll({
    where,
    limit: pageSize,
    offset,
    order: [['date_signed', 'DESC'], ['id', 'DESC']],
    include: listIncludes,
  });

  const contractIds = rows.map(c => c.id);

  const paymentTotals = await Payment.findAll({
    where: { sub_contract_id: { [Op.in]: contractIds } },
    attributes: [
      'sub_contract_id',
      [db.sequelize.fn('COALESCE', db.sequelize.fn('SUM', db.sequelize.col('payment_amount')), 0), 'total_paid'],
    ],
    group: ['sub_contract_id'],
    raw: true,
  });

  const invoiceTotals = await InvoiceIn.findAll({
    where: { sub_contract_id: { [Op.in]: contractIds } },
    attributes: [
      'sub_contract_id',
      [db.sequelize.fn('COALESCE', db.sequelize.fn('SUM', db.sequelize.col('invoice_amount')), 0), 'total_invoiced'],
    ],
    group: ['sub_contract_id'],
    raw: true,
  });

  const paymentMap = new Map();
  paymentTotals.forEach(item => {
    paymentMap.set(item.sub_contract_id, parseFloat(item.total_paid) || 0);
  });

  const invoiceMap = new Map();
  invoiceTotals.forEach(item => {
    invoiceMap.set(item.sub_contract_id, parseFloat(item.total_invoiced) || 0);
  });

  const dataWithSummary = rows.map((contract) => {
    const json = contract.toJSON();
    return {
      ...json,
      bonds: attachBondsDisplayStatus(json.bonds),
      total_paid: paymentMap.get(contract.id) || 0,
      total_invoiced: invoiceMap.get(contract.id) || 0,
    };
  });

  await attachFileStatus(dataWithSummary, FILE_MODULE);

  return { data: dataWithSummary, total };
}

/**
 * 获取单个分包合同
 */
async function findOneSubContract(id) {
  const subContract = await findSubContractWithRelations(id);
  if (!subContract) {
    throw new ApiError(404, '分包合同不存在', ERROR_CODES.RESOURCE_NOT_FOUND);
  }

  const data = subContract.toJSON();
  data.bonds = attachBondsDisplayStatus(data.bonds);
  data.has_files = await checkFileStatus(FILE_MODULE, id);
  return data;
}

/**
 * 更新分包合同
 */
async function updateSubContract(id, body, userId) {
  const updates = { updated_by: userId };
  for (const key of SUB_CONTRACT_WRITABLE_FIELDS) {
    if (body[key] !== undefined) {
      updates[key] = body[key];
    }
  }

  const [num] = await SubContract.update(updates, { where: { id } });

  if (num !== 1) {
    throw new ApiError(404, '分包合同不存在', ERROR_CODES.RESOURCE_NOT_FOUND);
  }

  return findSubContractWithRelations(id);
}

async function getSubContractRelatedCounts(id) {
  const [
    paymentCount,
    invoiceInCount,
    bondCount,
  ] = await Promise.all([
    Payment.count({ where: { sub_contract_id: id } }),
    InvoiceIn.count({ where: { sub_contract_id: id } }),
    Bond.count({ where: { sub_contract_id: id } }),
  ]);

  return {
    paymentCount,
    invoiceInCount,
    bondCount,
  };
}

function buildDeleteBlockedMessage(counts) {
  const parts = [];

  if (counts.paymentCount > 0) {
    parts.push(`付款记录 ${counts.paymentCount} 条`);
  }
  if (counts.invoiceInCount > 0) {
    parts.push(`进项发票 ${counts.invoiceInCount} 条`);
  }
  if (counts.bondCount > 0) {
    parts.push(`担保记录 ${counts.bondCount} 条`);
  }

  return parts.join('、');
}

/**
 * 删除分包合同（仅允许无业务关联数据时删除，并清理本合同附件）
 */
async function removeSubContract(id) {
  const subContract = await SubContract.findByPk(id);
  if (!subContract) {
    throw new ApiError(404, '分包合同不存在', ERROR_CODES.RESOURCE_NOT_FOUND);
  }

  const relatedCounts = await getSubContractRelatedCounts(id);
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
    const deletedFilesCount = await cleanupFiles({ sub_contract_id: id }, t);
    await subContract.destroy({ transaction: t });
    await t.commit();

    return { deletedFilesCount };
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

/**
 * 获取分包合同表单选择项
 */
async function getSubContractSelectOptions() {
  const [mainContracts, partyBCompanies, partyCCompanies] = await Promise.all([
    MainContract.findAll({
      where: { contract_status: { [Op.in]: ['执行中', '已完工'] } },
      attributes: ['id', 'contract_name', 'contract_status'],
      include: [{ model: Company, as: 'partyA', attributes: ['id', 'company_name', 'company_type'] }],
      order: [['contract_name', 'ASC']],
    }),
    Company.findAll({
      where: { company_type: '签约单位', company_status: '正常' },
      attributes: ['id', 'company_name', 'company_type'],
      order: [['company_name', 'ASC']],
    }),
    Company.findAll({
      where: { company_type: '合作单位', company_status: '正常' },
      attributes: ['id', 'company_name', 'company_type'],
      order: [['company_name', 'ASC']],
    }),
  ]);

  return {
    mainContracts,
    partyB: partyBCompanies,
    partyC: partyCCompanies,
  };
}

module.exports = {
  createSubContract,
  findAllSubContracts,
  findOneSubContract,
  updateSubContract,
  removeSubContract,
  getSubContractSelectOptions,
};
