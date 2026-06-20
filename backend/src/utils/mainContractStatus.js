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
};
