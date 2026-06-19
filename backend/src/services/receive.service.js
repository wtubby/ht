const db = require('../models');
const { Op } = require('sequelize');
const ApiError = require('../utils/ApiError');
const ERROR_CODES = require('../utils/errorCodes');
const { attachFileStatus, checkFileStatus } = require('../utils/fileStatusHelper');
const { removeRecordWithFiles } = require('../utils/recordRemoval');
const { resolveListPagination } = require('../utils/listPagination');
const { findMainContractsForSelect } = require('./contractSelect.service');

const { Receive, MainContract, Company } = db;

const FILE_MODULE = 'ZB_RECEIVE';

const mainContractInclude = {
  model: MainContract,
  as: 'mainContract',
  attributes: ['id', 'contract_name', 'amount_contract', 'contract_status'],
  include: [
    { model: Company, as: 'partyA', attributes: ['id', 'company_name'] },
    { model: Company, as: 'partyB', attributes: ['id', 'company_name'] },
  ],
};

function buildListWhere(query) {
  const {
    receive_status,
    main_contract_id,
    receive_date,
    payer_name,
    keyword,
    contract_name,
  } = query;

  const condition = {};
  const mainContractCondition = {};

  if (receive_status) condition.receive_status = receive_status;
  if (main_contract_id) condition.main_contract_id = main_contract_id;
  if (receive_date) condition.receive_date = receive_date;
  if (payer_name) condition.payer_name = { [Op.like]: `%${payer_name}%` };
  if (keyword) {
    condition[Op.or] = [
      { payer_name: { [Op.like]: `%${keyword}%` } },
      { payee_name: { [Op.like]: `%${keyword}%` } },
      { account_name: { [Op.like]: `%${keyword}%` } },
    ];
  }
  if (contract_name) {
    mainContractCondition.contract_name = { [Op.like]: `%${contract_name}%` };
  }

  return { condition, mainContractCondition };
}

async function findReceiveWithRelations(id) {
  return Receive.findByPk(id, { include: [mainContractInclude] });
}

async function attachTotalReceived(data) {
  const mainContractId = data.main_contract_id;
  if (!mainContractId) return data;

  const receiveTotals = await Receive.findAll({
    where: { main_contract_id: mainContractId },
    attributes: [
      [db.sequelize.fn('COALESCE', db.sequelize.fn('SUM', db.sequelize.col('receive_amount')), 0), 'total_received'],
    ],
    raw: true,
  });
  data.total_received = parseFloat(receiveTotals[0]?.total_received || 0);
  return data;
}

async function buildReceiveDetail(id) {
  const receive = await findReceiveWithRelations(id);
  if (!receive) {
    throw new ApiError(404, '收款记录不存在', ERROR_CODES.RESOURCE_NOT_FOUND);
  }

  const data = receive.toJSON();
  await attachTotalReceived(data);
  data.has_files = await checkFileStatus(FILE_MODULE, id);
  return data;
}

const RECEIVE_WRITABLE_FIELDS = [
  'receive_amount',
  'main_contract_id',
  'payer_name',
  'payee_name',
  'account_name',
  'bank_name',
  'account_number',
  'receive_date',
  'receive_status',
  'remarks',
];

/**
 * 创建收款
 */
async function createReceive(body, userId) {
  const data = { created_by: userId };
  for (const key of RECEIVE_WRITABLE_FIELDS) {
    data[key] = body[key];
  }

  const receive = await Receive.create(data);

  return buildReceiveDetail(receive.id);
}

/**
 * 获取收款列表
 */
async function findAllReceives(query) {
  const { pageSize, offset } = resolveListPagination(query);
  const { condition, mainContractCondition } = buildListWhere(query);
  const hasMainContractFilter = Object.keys(mainContractCondition).length > 0;

  const { count, rows } = await Receive.findAndCountAll({
    where: condition,
    limit: pageSize,
    offset,
    order: [['receive_date', 'DESC']],
    include: [{
      ...mainContractInclude,
      where: hasMainContractFilter ? mainContractCondition : undefined,
      required: hasMainContractFilter,
    }],
  });

  const rowsWithFiles = rows.map(r => ({ ...r.toJSON(), has_files: false }));
  await attachFileStatus(rowsWithFiles, FILE_MODULE);

  return { data: rowsWithFiles, total: count };
}

/**
 * 获取单个收款
 */
async function findOneReceive(id) {
  return buildReceiveDetail(id);
}

/**
 * 更新收款
 */
async function updateReceive(id, body, userId) {
  const updates = { updated_by: userId };
  for (const key of RECEIVE_WRITABLE_FIELDS) {
    if (body[key] !== undefined) {
      updates[key] = body[key];
    }
  }

  const [num] = await Receive.update(updates, { where: { id } });

  if (num !== 1) {
    throw new ApiError(404, '收款记录不存在', ERROR_CODES.RESOURCE_NOT_FOUND);
  }

  return buildReceiveDetail(id);
}

/**
 * 删除收款（含关联文件清理）
 */
async function removeReceive(id) {
  return removeRecordWithFiles({
    model: Receive,
    id,
    fileModule: FILE_MODULE,
    notFoundMessage: '收款记录不存在',
  });
}

/**
 * 获取收款表单选择项
 */
async function getReceiveSelectOptions() {
  return findMainContractsForSelect({ statusFilter: ['执行中', '已完工'] });
}

module.exports = {
  createReceive,
  findAllReceives,
  findOneReceive,
  updateReceive,
  removeReceive,
  getReceiveSelectOptions,
};
