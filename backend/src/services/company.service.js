const db = require('../models');
const { Op, QueryTypes } = require('sequelize');
const ApiError = require('../utils/ApiError');
const ERROR_CODES = require('../utils/errorCodes');
const { handleUniqueConstraintError } = require('../utils/dbErrors');
const { resolveListPagination } = require('../utils/listPagination');

const bankAccountService = require('./bankAccount.service');

const { Company, User, MainContract, SubContract } = db;

const creatorInclude = {
  model: User,
  as: 'creator',
  attributes: ['id', 'username', 'full_name'],
  required: false,
};

function buildListWhere(query) {
  const { company_name, company_type, company_status } = query;
  const condition = {};

  if (company_name) condition.company_name = { [Op.like]: `%${company_name}%` };
  if (company_type) condition.company_type = company_type;
  if (company_status) condition.company_status = company_status;

  return condition;
}

async function findCompanyWithRelations(id) {
  return Company.findByPk(id, { include: [creatorInclude] });
}

const COMPANY_WRITABLE_FIELDS = [
  'company_name',
  'company_type',
  'company_status',
  'credit_code',
  'legal_person',
  'reg_capital',
  'establish_date',
  'address',
  'remarks',
];

/**
 * 创建单位（可选同步银行账户，同一事务提交）
 */
async function createCompany(body, userId) {
  const { bankAccounts } = body;
  const data = { created_by: userId };
  for (const key of COMPANY_WRITABLE_FIELDS) {
    data[key] = body[key];
  }

  const t = await db.sequelize.transaction();

  try {
    const company = await Company.create(data, { transaction: t });

    if (bankAccounts !== undefined && bankAccounts.length > 0) {
      await bankAccountService.syncBankAccountsForCompany(company.id, bankAccounts, userId, t);
    }

    await t.commit();
    return enrichCompanyWithContractCount(await findCompanyWithRelations(company.id));
  } catch (error) {
    await t.rollback();
    if (error instanceof ApiError) throw error;
    handleUniqueConstraintError(error, {
      fallbackMessage: '数据已存在，请检查单位名称、信用代码或银行账号',
    });
  }
}

/**
 * 批量统计各单位关联合同份数（总包 + 分包）
 */
async function getContractCountsByCompanyIds(companyIds) {
  if (!companyIds.length) {
    return {};
  }

  const rows = await db.sequelize.query(
    `
    SELECT company_id, SUM(cnt) AS contract_count
    FROM (
      SELECT party_a_id AS company_id, COUNT(*) AS cnt
      FROM main_contracts
      WHERE party_a_id IN (:ids)
      GROUP BY party_a_id
      UNION ALL
      SELECT party_b_id AS company_id, COUNT(*) AS cnt
      FROM main_contracts
      WHERE party_b_id IN (:ids)
      GROUP BY party_b_id
      UNION ALL
      SELECT party_b_id AS company_id, COUNT(*) AS cnt
      FROM sub_contracts
      WHERE party_b_id IN (:ids)
      GROUP BY party_b_id
      UNION ALL
      SELECT party_c_id AS company_id, COUNT(*) AS cnt
      FROM sub_contracts
      WHERE party_c_id IN (:ids)
      GROUP BY party_c_id
    ) AS ref_counts
    GROUP BY company_id
    `,
    {
      replacements: { ids: companyIds },
      type: QueryTypes.SELECT,
    },
  );

  return Object.fromEntries(
    rows.map((row) => [row.company_id, Number(row.contract_count)]),
  );
}

function attachContractCountsToCompanies(companies, countsMap) {
  return companies.map((company) => {
    const plain = company.get ? company.get({ plain: true }) : company;
    return {
      ...plain,
      contract_count: countsMap[plain.id] ?? 0,
    };
  });
}

async function enrichCompanyWithContractCount(company) {
  const [enriched] = attachContractCountsToCompanies(
    [company],
    await getContractCountsByCompanyIds([company.id]),
  );
  return enriched;
}

/**
 * 获取单位列表
 */
async function findAllCompanies(query) {
  const { pageSize, offset } = resolveListPagination(query);

  const { count, rows } = await Company.findAndCountAll({
    where: buildListWhere(query),
    limit: pageSize,
    offset,
    order: [['id', 'DESC']],
    include: [creatorInclude],
  });

  const companyIds = rows.map((row) => row.id);
  const countsMap = await getContractCountsByCompanyIds(companyIds);
  const data = attachContractCountsToCompanies(rows, countsMap);

  return { data, total: count };
}

/**
 * 获取单个单位
 */
async function findOneCompany(id) {
  const company = await findCompanyWithRelations(id);
  if (!company) {
    throw new ApiError(404, '单位不存在', ERROR_CODES.RESOURCE_NOT_FOUND);
  }
  return enrichCompanyWithContractCount(company);
}

/**
 * 更新单位（可选同步银行账户，同一事务提交）
 */
async function updateCompany(id, body, userId) {
  const { bankAccounts } = body;
  const updates = { updated_by: userId };
  for (const key of COMPANY_WRITABLE_FIELDS) {
    if (body[key] !== undefined) {
      updates[key] = body[key];
    }
  }

  const t = await db.sequelize.transaction();

  try {
    const [num] = await Company.update(updates, { where: { id }, transaction: t });

    if (num !== 1) {
      throw new ApiError(404, '单位不存在', ERROR_CODES.RESOURCE_NOT_FOUND);
    }

    if (bankAccounts !== undefined) {
      await bankAccountService.syncBankAccountsForCompany(id, bankAccounts, userId, t);
    }

    await t.commit();
    return enrichCompanyWithContractCount(await findCompanyWithRelations(id));
  } catch (error) {
    await t.rollback();
    if (error instanceof ApiError) throw error;
    handleUniqueConstraintError(error, {
      fallbackMessage: '数据已存在，请检查单位名称、信用代码或银行账号',
    });
  }
}

/**
 * 统计单位被合同引用的份数（总包 + 分包，按合同条数计）
 */
async function countCompanyContractReferences(companyId) {
  const [mainContractCount, subContractCount] = await Promise.all([
    MainContract.count({
      where: {
        [Op.or]: [{ party_a_id: companyId }, { party_b_id: companyId }],
      },
    }),
    SubContract.count({
      where: {
        [Op.or]: [{ party_b_id: companyId }, { party_c_id: companyId }],
      },
    }),
  ]);

  return {
    mainContractCount,
    subContractCount,
    total: mainContractCount + subContractCount,
  };
}

/**
 * 删除单位（无合同引用时方可删除）
 */
async function removeCompany(id) {
  const company = await Company.findByPk(id);
  if (!company) {
    throw new ApiError(404, '单位不存在', ERROR_CODES.RESOURCE_NOT_FOUND);
  }

  const { total } = await countCompanyContractReferences(id);
  if (total > 0) {
    throw new ApiError(
      409,
      `已被 ${total} 份合同使用，请改为禁用`,
      ERROR_CODES.CONTRACT_HAS_RELATED_DATA,
    );
  }

  const num = await Company.destroy({ where: { id } });
  if (num !== 1) {
    throw new ApiError(404, '单位不存在', ERROR_CODES.RESOURCE_NOT_FOUND);
  }
}

module.exports = {
  createCompany,
  findAllCompanies,
  findOneCompany,
  updateCompany,
  removeCompany,
};
