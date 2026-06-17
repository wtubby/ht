const { Op } = require('sequelize');
const ApiError = require('../utils/ApiError');
const ERROR_CODES = require('../utils/errorCodes');
const { attachFileStatus, checkFileStatus } = require('../utils/fileStatusHelper');
const { removeRecordWithFiles } = require('../utils/recordRemoval');
const { resolveListPagination } = require('../utils/listPagination');

const DEFAULT_WRITABLE_FIELDS = [
  'invoice_no',
  'invoice_amount',
  'buyer',
  'seller',
  'invoice_date',
  'tax_rate',
  'remarks',
];

function buildInvoiceListWhere(query, contractField, contractSearchPath) {
  const {
    search,
    invoice_no,
    buyer,
    seller,
    invoice_date,
  } = query;

  const condition = {};

  if (search) {
    condition[Op.or] = [
      { invoice_no: { [Op.like]: `%${search}%` } },
      { [contractSearchPath]: { [Op.like]: `%${search}%` } },
    ];
  }
  if (invoice_no) {
    condition.invoice_no = { [Op.like]: `%${invoice_no}%` };
  }
  if (query[contractField]) {
    condition[contractField] = query[contractField];
  }
  if (buyer) {
    condition.buyer = { [Op.like]: `%${buyer}%` };
  }
  if (seller) {
    condition.seller = { [Op.like]: `%${seller}%` };
  }
  if (invoice_date) {
    condition.invoice_date = invoice_date;
  }

  return condition;
}

function createInvoiceService(config) {
  const {
    model,
    contractModel,
    contractField,
    contractSearchPath,
    listInclude,
    detailInclude,
    fileModule,
    notFoundMessage,
    contractNotFoundMessage,
    selectOptionsResolver,
    writableFields = DEFAULT_WRITABLE_FIELDS,
    enrichDetail,
  } = config;

  async function assertInvoiceNoUnique(invoiceNo, excludeId = null) {
    const whereCondition = { invoice_no: invoiceNo };
    if (excludeId) {
      whereCondition.id = { [Op.ne]: excludeId };
    }

    const existingInvoice = await model.findOne({ where: whereCondition });
    if (existingInvoice) {
      throw new ApiError(400, '发票号码已存在', ERROR_CODES.INVOICE_DUPLICATE);
    }
  }

  async function assertContractExists(contractId) {
    const contract = await contractModel.findByPk(contractId);
    if (!contract) {
      throw new ApiError(404, contractNotFoundMessage, ERROR_CODES.CONTRACT_NOT_FOUND);
    }
  }

  async function findAll(query) {
    const { pageSize, offset } = resolveListPagination(query);

    const { count, rows } = await model.findAndCountAll({
      where: buildInvoiceListWhere(query, contractField, contractSearchPath),
      limit: pageSize,
      offset,
      order: [['invoice_date', 'DESC'], ['id', 'DESC']],
      include: listInclude,
      subQuery: false,
      distinct: true,
      col: 'id',
    });

    const invoicesWithFileStatus = rows.map((row) => ({ ...row.toJSON(), has_files: false }));
    await attachFileStatus(invoicesWithFileStatus, fileModule);

    return { data: invoicesWithFileStatus, total: count };
  }

  async function findOne(id) {
    const record = await model.findByPk(id, { include: detailInclude });
    if (!record) {
      throw new ApiError(404, notFoundMessage, ERROR_CODES.RESOURCE_NOT_FOUND);
    }

    const data = record.toJSON();
    data.has_files = await checkFileStatus(fileModule, id);

    if (enrichDetail) {
      await enrichDetail(data);
    }

    return data;
  }

  async function create(body, userId) {
    await assertInvoiceNoUnique(body.invoice_no);
    await assertContractExists(body[contractField]);

    const payload = { created_by: userId };
    for (const key of writableFields) {
      if (body[key] !== undefined) {
        payload[key] = body[key];
      }
    }

    return model.create(payload);
  }

  async function update(id, body, userId) {
    const record = await model.findByPk(id);
    if (!record) {
      throw new ApiError(404, notFoundMessage, ERROR_CODES.RESOURCE_NOT_FOUND);
    }

    if (body.invoice_no !== undefined) {
      await assertInvoiceNoUnique(body.invoice_no, id);
    }
    if (body[contractField] !== undefined) {
      await assertContractExists(body[contractField]);
    }

    const updates = { updated_by: userId };
    for (const key of writableFields) {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    }

    await record.update(updates);
    return record;
  }

  async function remove(id) {
    return removeRecordWithFiles({
      model,
      id,
      fileModule,
      notFoundMessage,
    });
  }

  async function getSelectOptions(query = {}) {
    return selectOptionsResolver({
      search: query.search,
      limit: query.limit,
    });
  }

  return {
    findAll,
    findOne,
    create,
    update,
    remove,
    getSelectOptions,
  };
}

module.exports = {
  createInvoiceService,
};
