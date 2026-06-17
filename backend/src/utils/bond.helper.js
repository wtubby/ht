const BOND_TYPE_CONFIG = {
  履约保证金: {
    reqField: 'bond_perf_req',
    amtField: 'bond_perf_amt',
    formField: 'bond_perf_form',
  },
  民工保证金: {
    reqField: 'bond_labor_req',
    amtField: 'bond_labor_amt',
    formField: 'bond_labor_form',
  },
};

function getPlannedBondInfo(subContract, bondType) {
  const cfg = BOND_TYPE_CONFIG[bondType];
  if (!cfg || !subContract) {
    return { required: false, plannedAmount: null, plannedForm: null };
  }

  const rawAmount = subContract[cfg.amtField];
  const plannedAmount = rawAmount !== null && rawAmount !== undefined
    ? Number(rawAmount)
    : null;

  return {
    required: !!subContract[cfg.reqField],
    plannedAmount: Number.isFinite(plannedAmount) ? plannedAmount : null,
    plannedForm: subContract[cfg.formField] || null,
  };
}

function resolveBondAmount(subContract, bondType, bodyAmount) {
  if (bodyAmount !== undefined && bodyAmount !== null && bodyAmount !== '') {
    const parsed = Number(bodyAmount);
    return Number.isFinite(parsed) ? parsed : null;
  }

  const { plannedAmount } = getPlannedBondInfo(subContract, bondType);
  return plannedAmount;
}

function amountsEqual(a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    return true;
  }
  return Math.abs(a - b) < 0.005;
}

function buildAmountDeviationWarning(plannedAmount, actualAmount) {
  if (!Number.isFinite(plannedAmount) || plannedAmount <= 0) {
    return null;
  }
  if (!Number.isFinite(actualAmount)) {
    return null;
  }
  if (amountsEqual(plannedAmount, actualAmount)) {
    return null;
  }

  return {
    code: 'AMOUNT_DEVIATION',
    message: `约定金额：${plannedAmount.toFixed(2)} 元，本次录入：${actualAmount.toFixed(2)} 元，与约定不一致，请确认。`,
    planned_amount: plannedAmount,
    actual_amount: actualAmount,
  };
}

function buildBondFormMismatchWarning(subContract, bondType, bondForm) {
  const { plannedForm } = getPlannedBondInfo(subContract, bondType);
  if (!plannedForm || plannedForm === '不限' || !bondForm) {
    return null;
  }
  if (plannedForm === bondForm) {
    return null;
  }

  return {
    code: 'BOND_FORM_MISMATCH',
    message: `合同约定形式为「${plannedForm}」，与录入的「${bondForm}」不一致，请确认。`,
    planned_form: plannedForm,
    actual_form: bondForm,
  };
}

function collectBondWarnings(subContract, bondType, { amount, bond_form: bondForm }) {
  const { plannedAmount } = getPlannedBondInfo(subContract, bondType);
  const warnings = [];

  const amountWarning = buildAmountDeviationWarning(plannedAmount, amount);
  if (amountWarning) warnings.push(amountWarning);

  const formWarning = buildBondFormMismatchWarning(subContract, bondType, bondForm);
  if (formWarning) warnings.push(formWarning);

  return warnings;
}

function resolveDefaultBondForm(subContract, bondType, bodyBondForm) {
  if (bodyBondForm) {
    return bodyBondForm;
  }

  const { plannedForm } = getPlannedBondInfo(subContract, bondType);
  if (plannedForm === '现金' || plannedForm === '保函') {
    return plannedForm;
  }

  return null;
}

function sanitizeStatusOnWrite(requestedStatus, currentStatus, { isCreate = false } = {}) {
  if (isCreate) {
    return requestedStatus && requestedStatus !== '已退还' ? requestedStatus : '担保中';
  }

  if (requestedStatus === '已退还' && currentStatus !== '已退还') {
    return currentStatus;
  }

  return requestedStatus || currentStatus;
}

function bondRegistryKey(subContractId, bondType) {
  return `${subContractId}:${bondType}`;
}

/**
 * 展示用担保状态（与 bond.model computed_status 一致，供列表/嵌套 JSON 共用）
 */
function resolveBondDisplayStatus(bond) {
  if (!bond) return '担保中';

  const status = bond.status;
  const bondForm = bond.bond_form;
  const dateEnd = bond.date_end;

  if (status === '已退还') {
    return '已退还';
  }

  if (bondForm === '保函' && dateEnd) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(dateEnd);
    endDate.setHours(0, 0, 0, 0);

    if (endDate < today) {
      return '已过期';
    }
    return '担保中';
  }

  return status || '担保中';
}

function attachBondsDisplayStatus(bonds) {
  if (!bonds?.length) {
    return bonds || [];
  }

  return bonds.map((bond) => {
    const plain = bond && typeof bond.get === 'function' ? bond.get({ plain: true }) : bond;
    return {
      ...plain,
      display_status: resolveBondDisplayStatus(plain),
    };
  });
}

module.exports = {
  getPlannedBondInfo,
  resolveBondAmount,
  collectBondWarnings,
  resolveDefaultBondForm,
  sanitizeStatusOnWrite,
  bondRegistryKey,
  resolveBondDisplayStatus,
  attachBondsDisplayStatus,
};
