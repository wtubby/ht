const db = require('../models');
const { Op } = require('sequelize');
const ApiError = require('../utils/ApiError');
const ERROR_CODES = require('../utils/errorCodes');
const { handleUniqueConstraintError } = require('../utils/dbErrors');
const { attachFileStatus, checkFileStatus } = require('../utils/fileStatusHelper');
const { removeRecordWithFiles } = require('../utils/recordRemoval');
const { resolveListPagination } = require('../utils/listPagination');
const {
  getPlannedBondInfo,
  resolveBondAmount,
  collectBondWarnings,
  resolveDefaultBondForm,
  sanitizeStatusOnWrite,
  bondRegistryKey,
  resolveBondDisplayStatus,
} = require('../utils/bond.helper');
const { findSubContractsForSelect } = require('./contractSelect.service');

const { Bond, SubContract, MainContract, Company } = db;

const FILE_MODULE = 'FB_BOND';

const subContractBondAttributes = [
  'id',
  'contract_name',
  'amount_contract',
  'amount_settlement',
  'main_contract_id',
  'bond_perf_req',
  'bond_labor_req',
  'bond_perf_amt',
  'bond_labor_amt',
  'bond_perf_form',
  'bond_labor_form',
];

/** 担保下拉在共用分包字段之外追加的约定列 */
const BOND_SELECT_EXTRA_ATTRIBUTES = [
  'bond_perf_req',
  'bond_labor_req',
  'bond_perf_amt',
  'bond_labor_amt',
  'bond_perf_form',
  'bond_labor_form',
];

function enrichBondPlain(plainBond, subContract) {
  if (subContract && plainBond.bond_type) {
    const planned = getPlannedBondInfo(subContract, plainBond.bond_type);
    plainBond.planned_amount = planned.plannedAmount;
    plainBond.planned_form = planned.plannedForm;
  }
  return plainBond;
}

function processBondRow(bond) {
  const plainBond = bond.get({ plain: true });
  plainBond.display_status = resolveBondDisplayStatus(plainBond);
  enrichBondPlain(plainBond, plainBond.subContract);

  if (plainBond.amount && plainBond.subContract?.amount_contract) {
    const ratio = (Number(plainBond.amount) / Number(plainBond.subContract.amount_contract) * 100);
    plainBond.bond_ratio = Number(ratio.toFixed(2));
  } else {
    plainBond.bond_ratio = null;
  }

  return plainBond;
}

function getListSubContractInclude(search) {
  const include = {
    model: SubContract,
    as: 'subContract',
    attributes: subContractBondAttributes,
    include: [{
      model: Company,
      as: 'partyC',
      attributes: ['id', 'company_name'],
    }],
  };

  if (search) {
    include.where = {
      contract_name: { [Op.like]: `%${search}%` },
    };
  }

  return include;
}

const detailSubContractInclude = {
  model: SubContract,
  as: 'subContract',
  attributes: subContractBondAttributes,
  include: [
    {
      model: Company,
      as: 'partyC',
      attributes: ['id', 'company_name'],
    },
    {
      model: MainContract,
      as: 'mainContract',
      attributes: ['id', 'contract_name'],
    },
  ],
};

function buildDisplayStatusWhere(displayStatus) {
  if (!displayStatus) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (displayStatus === '已退还') {
    return { status: '已退还' };
  }

  if (displayStatus === '已过期') {
    return {
      [Op.and]: [
        { status: { [Op.ne]: '已退还' } },
        {
          [Op.or]: [
            {
              [Op.and]: [
                { bond_form: '保函' },
                { date_end: { [Op.ne]: null } },
                { date_end: { [Op.lt]: today } },
              ],
            },
            {
              [Op.and]: [
                {
                  [Op.or]: [
                    { bond_form: { [Op.ne]: '保函' } },
                    { date_end: null },
                  ],
                },
                { status: '已过期' },
              ],
            },
          ],
        },
      ],
    };
  }

  if (displayStatus === '担保中') {
    return {
      [Op.and]: [
        { status: { [Op.ne]: '已退还' } },
        {
          [Op.or]: [
            {
              [Op.and]: [
                { bond_form: '保函' },
                { date_end: { [Op.ne]: null } },
                { date_end: { [Op.gte]: today } },
              ],
            },
            {
              [Op.and]: [
                { bond_form: '保函' },
                { date_end: null },
                { status: '担保中' },
              ],
            },
            {
              [Op.and]: [
                { bond_form: '现金' },
                { status: '担保中' },
              ],
            },
          ],
        },
      ],
    };
  }

  return null;
}

function buildListWhere(query) {
  const { sub_contract_id, bond_type, bond_form, status } = query;
  const parts = [];

  const base = {};
  if (sub_contract_id) base.sub_contract_id = sub_contract_id;
  if (bond_type) base.bond_type = bond_type;
  if (bond_form) base.bond_form = bond_form;
  if (Object.keys(base).length > 0) parts.push(base);

  const displayStatusWhere = buildDisplayStatusWhere(status);
  if (displayStatusWhere) parts.push(displayStatusWhere);

  if (parts.length === 0) return {};
  if (parts.length === 1) return parts[0];
  return { [Op.and]: parts };
}

function buildListOrder(sorter) {
  if (!sorter) return [['created_at', 'DESC']];
  const [field, direction] = sorter.split('_');
  return [[field, direction === 'ascend' ? 'ASC' : 'DESC']];
}

async function loadSubContract(subContractId) {
  const subContract = await SubContract.findByPk(subContractId);
  if (!subContract) {
    throw new ApiError(404, '分包合同不存在', ERROR_CODES.RESOURCE_NOT_FOUND);
  }
  return subContract;
}

async function assertBondUnique(subContractId, bondType, excludeId) {
  const where = { sub_contract_id: subContractId, bond_type: bondType };
  if (excludeId) {
    where.id = { [Op.ne]: excludeId };
  }

  const existing = await Bond.findOne({ where });
  if (existing) {
    throw new ApiError(
      409,
      `该分包合同已存在${bondType}记录，请编辑已有台账`,
      ERROR_CODES.DUPLICATE_ENTRY,
    );
  }
}

function formatBondResult(bond, subContract) {
  const plain = bond.get({ plain: true });
  plain.display_status = resolveBondDisplayStatus(plain);
  enrichBondPlain(plain, subContract || plain.subContract);
  return plain;
}

/**
 * 创建担保
 */
async function createBond(body, userId) {
  const {
    sub_contract_id,
    bond_type,
    bond_form: bodyBondForm,
    status,
    organization,
    date_start,
    date_end,
    remarks,
  } = body;

  const subContract = await loadSubContract(sub_contract_id);
  await assertBondUnique(sub_contract_id, bond_type);

  const bondForm = resolveDefaultBondForm(subContract, bond_type, bodyBondForm);
  if (!bondForm) {
    throw new ApiError(400, '请选择保证金形式（现金或保函）', ERROR_CODES.VALIDATION_ERROR);
  }

  const amount = resolveBondAmount(subContract, bond_type, body.amount);
  const warnings = collectBondWarnings(subContract, bond_type, { amount, bond_form: bondForm });

  let bond;
  try {
    bond = await Bond.create({
      sub_contract_id,
      bond_type,
      bond_form: bondForm,
      amount: amount ?? null,
      status: sanitizeStatusOnWrite(status, null, { isCreate: true }),
      organization: organization || null,
      date_start: date_start || null,
      date_end: date_end || null,
      remarks: remarks || null,
      created_by: userId,
    });
  } catch (error) {
    handleUniqueConstraintError(error, {
      statusCode: 409,
      fallbackMessage: `该分包合同已存在${bond_type}记录，请编辑已有台账`,
    });
  }

  return {
    bond: formatBondResult(bond, subContract),
    warnings,
  };
}

/**
 * 将到期未退还的保函状态回写为"已过期"（懒同步，每次查询列表时触发）
 */
async function syncExpiredBondStatus() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  await Bond.update(
    { status: '已过期' },
    {
      where: {
        bond_form: '保函',
        status: { [Op.ne]: '已退还' },
        date_end: { [Op.lt]: today },
      },
    },
  );
}

/**
 * 获取担保列表
 */
async function findAllBonds(query) {
  const { search, sorter } = query;
  const { pageSize, offset } = resolveListPagination(query);

  await syncExpiredBondStatus();

  const { count, rows } = await Bond.findAndCountAll({
    where: buildListWhere(query),
    offset,
    limit: pageSize,
    order: buildListOrder(sorter),
    include: [getListSubContractInclude(search)],
    distinct: true,
  });

  const processedRows = rows.map(processBondRow);
  processedRows.forEach(row => { row.has_files = false; });
  await attachFileStatus(processedRows, FILE_MODULE);

  return { data: processedRows, total: count };
}

/**
 * 获取单个担保
 */
async function findOneBond(id) {
  const bond = await Bond.findByPk(id, {
    include: [detailSubContractInclude],
  });

  if (!bond) {
    throw new ApiError(404, '保证金不存在', ERROR_CODES.RESOURCE_NOT_FOUND);
  }

  const data = bond.get({ plain: true });
  data.display_status = resolveBondDisplayStatus(data);
  enrichBondPlain(data, data.subContract);
  data.has_files = await checkFileStatus(FILE_MODULE, id);
  return data;
}

/**
 * 更新担保
 */
async function updateBond(id, body, userId) {
  const {
    sub_contract_id,
    bond_type,
    bond_form,
    amount,
    status,
    organization,
    date_start,
    date_end,
    remarks,
  } = body;

  const bond = await Bond.findByPk(id);
  if (!bond) {
    throw new ApiError(404, '保证金不存在', ERROR_CODES.RESOURCE_NOT_FOUND);
  }

  const targetSubContractId = sub_contract_id !== undefined ? sub_contract_id : bond.sub_contract_id;
  const targetBondType = bond_type || bond.bond_type;
  const subContract = await loadSubContract(targetSubContractId);

  if (targetSubContractId !== bond.sub_contract_id || targetBondType !== bond.bond_type) {
    await assertBondUnique(targetSubContractId, targetBondType, id);
  }

  const nextAmount = amount !== undefined ? Number(amount) : Number(bond.amount);
  const nextBondForm = bond_form || bond.bond_form;
  const warnings = collectBondWarnings(subContract, targetBondType, {
    amount: nextAmount,
    bond_form: nextBondForm,
  });

  try {
    await bond.update({
      sub_contract_id: targetSubContractId,
      bond_type: targetBondType,
      bond_form: nextBondForm,
      amount: amount !== undefined ? amount : bond.amount,
      status: sanitizeStatusOnWrite(status, bond.status, { isCreate: false }),
      organization: organization !== undefined ? organization : bond.organization,
      date_start: date_start !== undefined ? date_start : bond.date_start,
      date_end: date_end !== undefined ? date_end : bond.date_end,
      remarks: remarks !== undefined ? remarks : bond.remarks,
      updated_by: userId,
    });
  } catch (error) {
    handleUniqueConstraintError(error, {
      statusCode: 409,
      fallbackMessage: `该分包合同已存在${targetBondType}记录，请编辑已有台账`,
    });
  }

  return {
    bond: formatBondResult(bond, subContract),
    warnings,
  };
}

/**
 * 删除担保（含关联文件清理）
 */
async function removeBond(id) {
  return removeRecordWithFiles({
    model: Bond,
    id,
    fileModule: FILE_MODULE,
    notFoundMessage: '担保不存在',
  });
}

/**
 * 退还担保
 */
async function refundBond(id, body, userId) {
  const {
    date_end,
    account_name,
    account_number,
    bank_name,
    remarks,
  } = body;

  const bond = await Bond.findByPk(id);
  if (!bond) {
    throw new ApiError(404, '保证金不存在', ERROR_CODES.RESOURCE_NOT_FOUND);
  }

  if (bond.bond_form !== '现金') {
    throw new ApiError(400, '仅现金形式的保证金可以退还', ERROR_CODES.VALIDATION_ERROR);
  }
  if (bond.status === '已退还') {
    throw new ApiError(400, '该保证金已退还', ERROR_CODES.DUPLICATE_ENTRY);
  }

  await bond.update({
    status: '已退还',
    date_end: date_end || null,
    account_name: account_name || null,
    account_number: account_number || null,
    bank_name: bank_name || null,
    remarks: remarks || bond.remarks,
    updated_by: userId,
  });

  return { bond: formatBondResult(bond), warnings: [] };
}

function buildBondRegistry(subContractPlain, bondIdMap) {
  const perf = getPlannedBondInfo(subContractPlain, '履约保证金');
  const labor = getPlannedBondInfo(subContractPlain, '民工保证金');
  const perfBondId = bondIdMap.get(bondRegistryKey(subContractPlain.id, '履约保证金')) || null;
  const laborBondId = bondIdMap.get(bondRegistryKey(subContractPlain.id, '民工保证金')) || null;

  const pendingBondTypes = [];
  if (perf.required && !perfBondId) pendingBondTypes.push('履约保证金');
  if (labor.required && !laborBondId) pendingBondTypes.push('民工保证金');

  return {
    bond_registry: {
      履约保证金: {
        bond_id: perfBondId,
        required: perf.required,
        planned_amount: perf.plannedAmount,
        planned_form: perf.plannedForm,
      },
      民工保证金: {
        bond_id: laborBondId,
        required: labor.required,
        planned_amount: labor.plannedAmount,
        planned_form: labor.plannedForm,
      },
    },
    pending_bond_types: pendingBondTypes,
  };
}

async function getBondSelectOptions(query = {}) {
  const onlyPending = query.only_pending === 'true' || query.only_pending === true;

  const subContracts = await findSubContractsForSelect({
    extraAttributes: BOND_SELECT_EXTRA_ATTRIBUTES,
  });

  const bonds = await Bond.findAll({
    attributes: ['id', 'sub_contract_id', 'bond_type'],
  });

  const bondIdMap = new Map();
  bonds.forEach((item) => {
    bondIdMap.set(bondRegistryKey(item.sub_contract_id, item.bond_type), item.id);
  });

  let result = subContracts.map((item) => {
    const plain = item.get({ plain: true });
    return {
      ...plain,
      ...buildBondRegistry(plain, bondIdMap),
    };
  });

  if (onlyPending) {
    result = result.filter((item) => item.pending_bond_types.length > 0);
  }

  return result;
}

module.exports = {
  createBond,
  findAllBonds,
  findOneBond,
  updateBond,
  removeBond,
  refundBond,
  getBondSelectOptions,
};
