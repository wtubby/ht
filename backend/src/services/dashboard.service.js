const { Op } = require('sequelize');
const {
  MainContract,
  SubContract,
  Receive,
  InvoiceOut,
  InvoiceIn,
  File,
  Bond,
  sequelize,
} = require('../models');
const { resolveBondDisplayStatus } = require('../utils/bond.helper');

/**
 * 日期格式化列辅助函数 - 抽象数据库方言差异
 */
function formatDateColumn(column, format) {
  return sequelize.fn('DATE_FORMAT', sequelize.col(column), format);
}

function buildRangeFilter(timeRange, startDate, endDate) {
  const now = new Date();
  let filter = {};

  switch (timeRange) {
    case 'today': {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      filter = {
        [Op.gte]: today,
        [Op.lt]: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      };
      break;
    }
    case 'month': {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      filter = {
        [Op.gte]: monthStart,
        [Op.lt]: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      };
      break;
    }
    case 'year': {
      const yearStart = new Date(now.getFullYear(), 0, 1);
      filter = {
        [Op.gte]: yearStart,
        [Op.lt]: new Date(now.getFullYear() + 1, 0, 1),
      };
      break;
    }
    case 'custom':
      if (startDate && endDate) {
        filter = {
          [Op.gte]: startDate,
          [Op.lte]: endDate,
        };
      }
      break;
    default:
      break;
  }

  return filter;
}

function hasRangeFilter(filter) {
  return Object.keys(filter).length > 0 || Object.getOwnPropertySymbols(filter).length > 0;
}

function buildDateFieldFilter(dateField, timeRange, startDate, endDate) {
  const filter = buildRangeFilter(timeRange, startDate, endDate);
  if (!hasRangeFilter(filter)) return {};
  return { [dateField]: filter };
}

/** 根据顶部时间范围推导趋势图粒度与查询区间 */
function resolveTrendConfig(timeRange, startDate, endDate) {
  const now = new Date();

  switch (timeRange) {
    case 'today': {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return {
        type: 'day',
        dateFormat: '%Y-%m-%d',
        whereCondition: {
          [Op.gte]: today,
          [Op.lt]: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      };
    }
    case 'month': {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return {
        type: 'day',
        dateFormat: '%Y-%m-%d',
        whereCondition: { [Op.gte]: monthStart, [Op.lte]: monthEnd },
      };
    }
    case 'year': {
      const yearStart = new Date(now.getFullYear(), 0, 1);
      const yearEnd = new Date(now.getFullYear(), 11, 31);
      return {
        type: 'month',
        dateFormat: '%Y-%m',
        whereCondition: { [Op.gte]: yearStart, [Op.lte]: yearEnd },
      };
    }
    case 'custom': {
      if (!startDate || !endDate) {
        const fiveYearsAgo = new Date(now.getFullYear() - 4, 0, 1);
        return {
          type: 'month',
          dateFormat: '%Y-%m',
          whereCondition: { [Op.gte]: fiveYearsAgo },
        };
      }
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffDays = Math.ceil((end - start) / (24 * 60 * 60 * 1000)) + 1;
      if (diffDays <= 31) {
        return {
          type: 'day',
          dateFormat: '%Y-%m-%d',
          whereCondition: { [Op.gte]: startDate, [Op.lte]: endDate },
        };
      }
      return {
        type: 'month',
        dateFormat: '%Y-%m',
        whereCondition: { [Op.gte]: startDate, [Op.lte]: endDate },
      };
    }
    case 'all':
    default: {
      const fiveYearsAgo = new Date(now.getFullYear() - 4, 0, 1);
      return {
        type: 'month',
        dateFormat: '%Y-%m',
        whereCondition: { [Op.gte]: fiveYearsAgo },
      };
    }
  }
}

function normalizeDistributionLabel(value) {
  if (value == null || value === '') return '未设置';
  return String(value);
}

function mapDistributionItem(item, labelKey) {
  const mapped = {
    ...item,
    [labelKey]: normalizeDistributionLabel(item[labelKey]),
    count: parseInt(item.count, 10) || 0,
  };
  if (item.total_amount != null) {
    mapped.total_amount = parseFloat(item.total_amount) || 0;
  }
  return mapped;
}

function filterValidTrendRows(rows) {
  return rows.filter((item) => item.date != null && item.date !== '');
}
async function getStatistics(query) {
  const {
    timeRange = 'all',
    startDate,
    endDate,
  } = query;

  const mainContractStats = await MainContract.findAll({
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      [sequelize.fn('SUM', sequelize.col('amount_contract')), 'total_amount'],
      [sequelize.fn('SUM', sequelize.col('amount_settlement')), 'total_settlement'],
    ],
    where: buildDateFieldFilter('date_signed', timeRange, startDate, endDate),
    raw: true,
  });

  const mainContractStatusDistribution = await MainContract.findAll({
    attributes: [
      'contract_status',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
    ],
    group: ['contract_status'],
    raw: true,
  }).then(result => result.map(item => mapDistributionItem(item, 'contract_status')));

  const subContractStats = await SubContract.findAll({
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      [sequelize.fn('SUM', sequelize.col('amount_contract')), 'total_amount'],
      [sequelize.fn('SUM', sequelize.col('amount_settlement')), 'total_settlement'],
    ],
    where: buildDateFieldFilter('date_signed', timeRange, startDate, endDate),
    raw: true,
  });

  const subContractTypeDistribution = await SubContract.findAll({
    attributes: [
      'contract_type',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
    ],
    group: ['contract_type'],
    raw: true,
  }).then(result => result.map(item => mapDistributionItem(item, 'contract_type')));

  const receiveStats = await Receive.findAll({
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      [sequelize.fn('SUM', sequelize.col('receive_amount')), 'total_amount'],
    ],
    where: buildDateFieldFilter('receive_date', timeRange, startDate, endDate),
    raw: true,
  });

  const bondStatusDistribution = await Bond.findAll({
    attributes: ['status', 'bond_form', 'date_end', 'amount'],
    raw: true,
  }).then((bonds) => {
    const statusMap = {};
    bonds.forEach((bond) => {
      const displayStatus = resolveBondDisplayStatus(bond);
      if (!statusMap[displayStatus]) {
        statusMap[displayStatus] = {
          bond_status: displayStatus,
          count: 0,
          total_amount: 0,
        };
      }
      statusMap[displayStatus].count += 1;
      statusMap[displayStatus].total_amount += parseFloat(bond.amount || 0);
    });
    return Object.values(statusMap).map((item) => mapDistributionItem(item, 'bond_status'));
  });

  const invoiceOutStats = await InvoiceOut.findAll({
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      [sequelize.fn('SUM', sequelize.col('invoice_amount')), 'total_amount'],
    ],
    where: buildDateFieldFilter('invoice_date', timeRange, startDate, endDate),
    raw: true,
  });

  const invoiceInStats = await InvoiceIn.findAll({
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      [sequelize.fn('SUM', sequelize.col('invoice_amount')), 'total_amount'],
    ],
    where: buildDateFieldFilter('invoice_date', timeRange, startDate, endDate),
    raw: true,
  });

  const fileStats = await File.findAll({
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      [sequelize.fn('SUM', sequelize.col('file_size')), 'total_size'],
    ],
    where: buildDateFieldFilter('uploaded_at', timeRange, startDate, endDate),
    raw: true,
  });

  const fileModuleDistribution = await File.findAll({
    attributes: [
      'file_module',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
    ],
    group: ['file_module'],
    raw: true,
  }).then(result => result.map(item => mapDistributionItem(item, 'file_module')));

  const totalContractAmount = parseFloat(mainContractStats[0].total_amount || 0);
  const totalReceiveAmount = parseFloat(receiveStats[0].total_amount || 0);
  const receiveRate = totalContractAmount > 0
    ? ((totalReceiveAmount / totalContractAmount) * 100).toFixed(2)
    : 0;

  return {
    overview: {
      mainContract: {
        count: parseInt(mainContractStats[0].count || 0, 10),
        totalAmount: parseFloat(mainContractStats[0].total_amount || 0),
        settlementAmount: parseFloat(mainContractStats[0].total_settlement || 0),
      },
      subContract: {
        count: parseInt(subContractStats[0].count || 0, 10),
        totalAmount: parseFloat(subContractStats[0].total_amount || 0),
        settlementAmount: parseFloat(subContractStats[0].total_settlement || 0),
      },
      receive: {
        count: parseInt(receiveStats[0].count || 0, 10),
        totalAmount: totalReceiveAmount,
        receiveRate: parseFloat(receiveRate),
      },
      invoiceOut: {
        count: parseInt(invoiceOutStats[0].count || 0, 10),
        totalAmount: parseFloat(invoiceOutStats[0].total_amount || 0),
      },
      invoiceIn: {
        count: parseInt(invoiceInStats[0].count || 0, 10),
        totalAmount: parseFloat(invoiceInStats[0].total_amount || 0),
      },
      file: {
        count: parseInt(fileStats[0].count || 0, 10),
        totalSize: parseInt(fileStats[0].total_size || 0, 10),
      },
    },
    distribution: {
      mainContractStatus: mainContractStatusDistribution,
      subContractType: subContractTypeDistribution,
      bondStatus: bondStatusDistribution,
      fileModule: fileModuleDistribution,
    },
    timeRange,
  };
}

/**
 * 获取项目收款进度
 */
async function getProjectReceiveProgress(query) {
  const {
    timeRange = 'all',
    startDate,
    endDate,
    limit = 10,
  } = query;

  const receiveDateFilter = buildRangeFilter(timeRange, startDate, endDate);

  const receiveStats = await Receive.findAll({
    attributes: [
      'main_contract_id',
      [sequelize.fn('SUM', sequelize.col('receive_amount')), 'received_amount'],
    ],
    where: hasRangeFilter(receiveDateFilter) ? { receive_date: receiveDateFilter } : undefined,
    group: ['main_contract_id'],
    raw: true,
  });

  const receiveMap = {};
  receiveStats.forEach(stat => {
    receiveMap[stat.main_contract_id] = parseFloat(stat.received_amount);
  });

  const contracts = await MainContract.findAll({
    attributes: ['id', 'contract_name', 'amount_contract'],
    raw: true,
  });

  return contracts
    .map(contract => {
      const totalAmount = parseFloat(contract.amount_contract);
      const receivedAmount = receiveMap[contract.id] || 0;
      const receiveRate = totalAmount > 0
        ? Math.round((receivedAmount / totalAmount) * 1000) / 10
        : 0;

      return {
        id: contract.id,
        projectName: contract.contract_name,
        totalAmount,
        receivedAmount,
        receiveRate,
      };
    })
    .sort((a, b) => b.receivedAmount - a.receivedAmount)
    .slice(0, parseInt(limit, 10));
}

/**
 * 获取趋势数据 (按日/月/年分组)
 */
async function getTrendData(query) {
  const {
    timeRange = 'all',
    startDate,
    endDate,
  } = query;

  const { type, dateFormat, whereCondition } = resolveTrendConfig(timeRange, startDate, endDate);

  const contractTrend = await MainContract.findAll({
    attributes: [
      [formatDateColumn('date_signed', dateFormat), 'date'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      [sequelize.fn('SUM', sequelize.col('amount_contract')), 'amount'],
    ],
    where: { date_signed: whereCondition },
    group: [formatDateColumn('date_signed', dateFormat)],
    order: [[formatDateColumn('date_signed', dateFormat), 'ASC']],
    raw: true,
  });

  const receiveTrend = await Receive.findAll({
    attributes: [
      [formatDateColumn('receive_date', dateFormat), 'date'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      [sequelize.fn('SUM', sequelize.col('receive_amount')), 'amount'],
    ],
    where: { receive_date: whereCondition },
    group: [formatDateColumn('receive_date', dateFormat)],
    order: [[formatDateColumn('receive_date', dateFormat), 'ASC']],
    raw: true,
  });

  const invoiceOutTrend = await InvoiceOut.findAll({
    attributes: [
      [formatDateColumn('invoice_date', dateFormat), 'date'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      [sequelize.fn('SUM', sequelize.col('invoice_amount')), 'amount'],
    ],
    where: { invoice_date: whereCondition },
    group: [formatDateColumn('invoice_date', dateFormat)],
    order: [[formatDateColumn('invoice_date', dateFormat), 'ASC']],
    raw: true,
  });

  const invoiceInTrend = await InvoiceIn.findAll({
    attributes: [
      [formatDateColumn('invoice_date', dateFormat), 'date'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      [sequelize.fn('SUM', sequelize.col('invoice_amount')), 'amount'],
    ],
    where: { invoice_date: whereCondition },
    group: [formatDateColumn('invoice_date', dateFormat)],
    order: [[formatDateColumn('invoice_date', dateFormat), 'ASC']],
    raw: true,
  });

  return {
    contractTrend: filterValidTrendRows(contractTrend),
    receiveTrend: filterValidTrendRows(receiveTrend),
    invoiceOutTrend: filterValidTrendRows(invoiceOutTrend),
    invoiceInTrend: filterValidTrendRows(invoiceInTrend),
    type,
  };
}

module.exports = {
  getStatistics,
  getProjectReceiveProgress,
  getTrendData,
};
