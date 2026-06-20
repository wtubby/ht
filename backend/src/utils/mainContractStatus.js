const db = require('../models');

const { MainContract, Receive, InvoiceOut } = db;

const AMOUNT_EPSILON = 0.005;

function toAmount(value) {
  if (value == null || value === '') return null;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

function isAmountSatisfied(total, target) {
  const settlement = toAmount(target);
  if (settlement == null || settlement <= 0) return false;
  const amount = toAmount(total) ?? 0;
  return amount + AMOUNT_EPSILON >= settlement;
}

function normalizeDateOnly(value) {
  if (value == null || value === '') return null;
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  const text = String(value).trim();
  if (!text) return null;
  return text.slice(0, 10);
}

function toWarrantyYears(value) {
  if (value == null || value === '') return null;
  const years = parseFloat(value);
  return Number.isFinite(years) && years >= 0 ? years : null;
}

function formatDateOnly(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addMonthsToDateOnly(dateStr, months) {
  const source = normalizeDateOnly(dateStr);
  if (!source) return null;

  const [year, month, day] = source.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const originalDay = date.getDate();
  date.setMonth(date.getMonth() + months);
  if (date.getDate() < originalDay) {
    date.setDate(0);
  }

  return formatDateOnly(date);
}

/**
 * 根据竣工日期与保修年限计算保修截止日期
 * @param {string|Date|null|undefined} dateEnd
 * @param {number|string|null|undefined} warrantyYears
 * @returns {string|null}
 */
function computeWarrantyEndDate(dateEnd, warrantyYears) {
  const end = normalizeDateOnly(dateEnd);
  const years = toWarrantyYears(warrantyYears);
  if (!end || years == null) return null;

  const months = Math.round(years * 12);
  return addMonthsToDateOnly(end, months);
}

/**
 * 写库前解析保修截止日期：有完整输入时按公式计算；与公式不一致时保留手动值
 * @param {{ date_end?: *, warranty_years?: *, date_warranty?: * }} input
 * @returns {string|null}
 */
function resolveDateWarrantyOnWrite({ date_end, warranty_years, date_warranty }) {
  const computed = computeWarrantyEndDate(date_end, warranty_years);
  const requested = normalizeDateOnly(date_warranty);

  if (computed == null) {
    return requested;
  }
  if (requested == null) {
    return computed;
  }
  if (requested !== computed) {
    return requested;
  }
  return computed;
}

/**
 * 根据日期、结算金额与收开票汇总推导总包合同状态
 * @param {object} contract
 * @param {object} [totals]
 * @returns {'未签约'|'执行中'|'已完工'|'已完结'}
 */
function resolveMainContractStatus(contract, totals = {}) {
  const dateSigned = contract.date_signed;
  const dateEnd = contract.date_end;
  const settlement = toAmount(contract.amount_settlement);
  const totalReceived = toAmount(totals.total_received) ?? 0;
  const totalInvoiced = toAmount(totals.total_invoiced) ?? 0;

  if (
    dateEnd
    && settlement != null
    && isAmountSatisfied(totalReceived, settlement)
    && isAmountSatisfied(totalInvoiced, settlement)
  ) {
    return '已完结';
  }
  if (dateEnd) return '已完工';
  if (dateSigned) return '执行中';
  return '未签约';
}

async function getMainContractTotals(mainContractId, transaction) {
  const sumOptions = {
    where: { main_contract_id: mainContractId },
    transaction,
  };

  const [totalReceived, totalInvoiced] = await Promise.all([
    Receive.sum('receive_amount', sumOptions),
    InvoiceOut.sum('invoice_amount', sumOptions),
  ]);

  return {
    total_received: parseFloat(totalReceived || 0),
    total_invoiced: parseFloat(totalInvoiced || 0),
  };
}

/**
 * 按当前数据重算并写回总包合同状态（支持事务）
 */
async function syncMainContractStatus(mainContractId, transaction) {
  if (!mainContractId) return;

  const contract = await MainContract.findByPk(mainContractId, { transaction });
  if (!contract) return;

  const totals = await getMainContractTotals(mainContractId, transaction);
  const newStatus = resolveMainContractStatus(contract, totals);

  if (contract.contract_status !== newStatus) {
    await contract.update({ contract_status: newStatus }, { transaction });
  }
}

module.exports = {
  resolveMainContractStatus,
  getMainContractTotals,
  syncMainContractStatus,
  computeWarrantyEndDate,
  resolveDateWarrantyOnWrite,
};
