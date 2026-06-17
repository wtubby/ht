const db = require('../models');
const { Op } = require('sequelize');

const { SubContract, MainContract, Company } = db;

const SUB_CONTRACT_SELECT_ATTRIBUTES = [
  'id',
  'contract_name',
  'contract_status',
  'contract_type',
  'amount_contract',
  'amount_settlement',
  'main_contract_id',
];

const subContractSelectInclude = [
  {
    model: MainContract,
    as: 'mainContract',
    attributes: ['id', 'contract_name', 'amount_contract'],
    include: [
      { model: Company, as: 'partyA', attributes: ['id', 'company_name'] },
      { model: Company, as: 'partyB', attributes: ['id', 'company_name'] },
    ],
  },
  { model: Company, as: 'partyB', attributes: ['id', 'company_name', 'company_type'] },
  { model: Company, as: 'partyC', attributes: ['id', 'company_name', 'company_type'] },
];

/**
 * 表单下拉：分包合同（付款/进项/担保等共用）
 * @param {object} [options]
 * @param {string[]} [options.extraAttributes] 在基础字段之上追加查询列（如担保约定字段）
 * @param {string} [options.search] 按合同名称过滤
 * @param {number|string} [options.limit] 限制返回数量
 */
async function findSubContractsForSelect({ extraAttributes = [], search, limit } = {}) {
  const keyword = String(search ?? '').trim();
  const parsedLimit = Number(limit);
  const normalizedLimit = Number.isFinite(parsedLimit) && parsedLimit > 0
    ? Math.min(Math.trunc(parsedLimit), 50)
    : undefined;

  return SubContract.findAll({
    where: keyword
      ? { contract_name: { [Op.like]: `%${keyword}%` } }
      : undefined,
    attributes: [...SUB_CONTRACT_SELECT_ATTRIBUTES, ...extraAttributes],
    include: subContractSelectInclude,
    order: [['contract_name', 'ASC']],
    ...(normalizedLimit ? { limit: normalizedLimit } : {}),
  });
}

/** 表单下拉：总包合同（销项/收款等共用） */
async function findMainContractsForSelect({ statusFilter, search, limit } = {}) {
  const keyword = String(search ?? '').trim();
  const parsedLimit = Number(limit);
  const normalizedLimit = Number.isFinite(parsedLimit) && parsedLimit > 0
    ? Math.min(Math.trunc(parsedLimit), 50)
    : undefined;
  const where = {};

  if (statusFilter) {
    where.contract_status = { [Op.in]: statusFilter };
  }
  if (keyword) {
    where.contract_name = { [Op.like]: `%${keyword}%` };
  }

  return MainContract.findAll({
    where: Object.keys(where).length > 0 ? where : undefined,
    attributes: ['id', 'contract_name', 'contract_status', 'amount_contract'],
    include: [
      { model: Company, as: 'partyA', attributes: ['id', 'company_name', 'company_type'] },
      { model: Company, as: 'partyB', attributes: ['id', 'company_name', 'company_type'] },
    ],
    order: [['contract_name', 'ASC']],
    ...(normalizedLimit ? { limit: normalizedLimit } : {}),
  });
}

module.exports = {
  findSubContractsForSelect,
  findMainContractsForSelect,
};
