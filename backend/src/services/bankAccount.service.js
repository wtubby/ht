const db = require('../models');
const ApiError = require('../utils/ApiError');
const ERROR_CODES = require('../utils/errorCodes');
const { handleUniqueConstraintError } = require('../utils/dbErrors');

const { CompanyBankAccount, Company } = db;

const companyInclude = {
  model: Company,
  as: 'company',
  attributes: ['id', 'company_name'],
};

const BANK_ACCOUNT_DUPLICATE_MESSAGE = '该银行账号已存在';

function pickBankAccountFields(account, { includeDefault = false } = {}) {
  const fields = {
    account_name: account.account_name,
    account_number: account.account_number,
    bank_name: account.bank_name,
    account_status: account.account_status || '正常',
    remarks: account.remarks ?? null,
  };

  if (includeDefault) {
    fields.is_default = account.is_default ?? false;
  }

  return fields;
}

function isDefaultAccount(account) {
  return account.is_default === true || account.is_default === 1;
}

function hasRequiredBankFields(account) {
  return account.account_name && account.account_number && account.bank_name;
}

async function findBankAccountWithRelations(id, transaction) {
  return CompanyBankAccount.findByPk(id, {
    include: [companyInclude],
    ...(transaction ? { transaction } : {}),
  });
}

/**
 * 创建银行账户
 * @param {Object} body - 账户字段
 * @param {number} userId - 创建人
 * @param {string|number} [companyIdFromRoute] - 嵌套路由 /companies/:companyId/bank-accounts 传入
 * @param {{ transaction?: import('sequelize').Transaction }} [options]
 */
async function createBankAccount(body, userId, companyIdFromRoute, options = {}) {
  const { transaction } = options;
  const companyId = companyIdFromRoute
    ? parseInt(companyIdFromRoute, 10)
    : body.company_id;

  if (!companyId || Number.isNaN(companyId)) {
    throw new ApiError(400, '缺少公司ID', ERROR_CODES.VALIDATION_ERROR);
  }

  let account;
  try {
    account = await CompanyBankAccount.create(
      {
        ...body,
        company_id: companyId,
        created_by: userId,
      },
      { transaction },
    );
  } catch (error) {
    handleUniqueConstraintError(error, { fallbackMessage: BANK_ACCOUNT_DUPLICATE_MESSAGE });
  }

  return findBankAccountWithRelations(account.id, transaction);
}

/**
 * 更新银行账户
 * @param {{ transaction?: import('sequelize').Transaction, companyId?: number }} [options]
 */
async function updateBankAccount(id, body, userId, options = {}) {
  const { transaction, companyId } = options;
  const where = { id };
  if (companyId !== undefined) {
    where.company_id = companyId;
  }

  try {
    const [num] = await CompanyBankAccount.update(
      { ...body, updated_by: userId },
      { where, transaction },
    );

    if (num !== 1) {
      throw new ApiError(404, '银行账户不存在', ERROR_CODES.RESOURCE_NOT_FOUND);
    }

    return findBankAccountWithRelations(id, transaction);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    handleUniqueConstraintError(error, { fallbackMessage: BANK_ACCOUNT_DUPLICATE_MESSAGE });
  }
}

/**
 * 删除银行账户
 * @param {{ transaction?: import('sequelize').Transaction, companyId?: number }} [options]
 */
async function removeBankAccount(id, options = {}) {
  const { transaction, companyId } = options;
  const where = { id };
  if (companyId !== undefined) {
    where.company_id = companyId;
  }

  const num = await CompanyBankAccount.destroy({ where, transaction });
  if (num !== 1) {
    throw new ApiError(404, '银行账户不存在', ERROR_CODES.RESOURCE_NOT_FOUND);
  }
}

/**
 * 按公司 ID 获取银行账户列表
 */
async function findBankAccountsByCompany(companyId) {
  return CompanyBankAccount.findAll({
    where: { company_id: companyId },
    order: [['is_default', 'DESC'], ['id', 'ASC']],
  });
}

/**
 * 设为默认银行账户
 * @param {{ transaction?: import('sequelize').Transaction }} [options]
 */
async function setDefaultBankAccount(id, userId, options = {}) {
  const { transaction } = options;
  const account = await CompanyBankAccount.findByPk(id, transaction ? { transaction } : undefined);
  if (!account) {
    throw new ApiError(404, '银行账户不存在', ERROR_CODES.RESOURCE_NOT_FOUND);
  }

  const applyDefault = async (t) => {
    await CompanyBankAccount.update(
      { is_default: false },
      { where: { company_id: account.company_id }, transaction: t },
    );

    await CompanyBankAccount.update(
      { is_default: true, updated_by: userId },
      { where: { id }, transaction: t },
    );
  };

  if (transaction) {
    await applyDefault(transaction);
  } else {
    const t = await db.sequelize.transaction();
    try {
      await applyDefault(t);
      await t.commit();
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  return findBankAccountWithRelations(id, transaction);
}

/**
 * 同步完成后 reconciled 默认账户（提交列表中最多一个 is_default）
 */
async function reconcileDefaultAfterSync(defaultAccountIds, userId, transaction) {
  if (defaultAccountIds.length === 0) {
    return;
  }

  if (defaultAccountIds.length > 1) {
    throw new ApiError(400, '只能设置一个默认银行账户', ERROR_CODES.VALIDATION_ERROR);
  }

  await setDefaultBankAccount(defaultAccountIds[0], userId, { transaction });
}

/**
 * 按提交的完整列表同步某公司银行账户（增删改，需在调用方事务内调用）
 */
async function syncBankAccountsForCompany(companyId, bankAccounts, userId, transaction) {
  const existing = await CompanyBankAccount.findAll({
    where: { company_id: companyId },
    transaction,
  });
  const existingMap = new Map(existing.map((account) => [account.id, account]));

  const submittedWithId = bankAccounts.filter((account) => account.id);
  const submittedIds = new Set(submittedWithId.map((account) => account.id));

  for (const account of submittedWithId) {
    if (!existingMap.has(account.id)) {
      throw new ApiError(400, '银行账户不存在或不属于该单位', ERROR_CODES.VALIDATION_ERROR);
    }
  }

  const idsToDelete = existing
    .filter((account) => !submittedIds.has(account.id))
    .map((account) => account.id);

  for (const id of idsToDelete) {
    await removeBankAccount(id, { transaction, companyId });
  }

  const defaultAccountIds = [];

  for (const account of bankAccounts) {
    const fields = pickBankAccountFields(account);

    if (account.id) {
      await updateBankAccount(account.id, fields, userId, { transaction, companyId });
      if (isDefaultAccount(account)) {
        defaultAccountIds.push(account.id);
      }
    } else if (hasRequiredBankFields(account)) {
      const created = await createBankAccount(fields, userId, companyId, { transaction });
      if (isDefaultAccount(account)) {
        defaultAccountIds.push(created.id);
      }
    }
  }

  await reconcileDefaultAfterSync(defaultAccountIds, userId, transaction);
}

module.exports = {
  createBankAccount,
  updateBankAccount,
  removeBankAccount,
  findBankAccountsByCompany,
  setDefaultBankAccount,
  syncBankAccountsForCompany,
};
