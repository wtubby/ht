const LIST_MAX_PAGE_SIZE = 100;
const FILTERED_MAX_PAGE_SIZE = 1000;

/** 存在以下筛选条件时允许更大 pageSize（详情聚合、按合同查关联数据等） */
const EXPANDED_PAGE_SIZE_FILTER_KEYS = [
  'main_contract_id',
  'sub_contract_id',
  'contract_name',
  'company_id',
  'file_module',
];

function hasExpandedPageSizeFilter(query = {}) {
  return EXPANDED_PAGE_SIZE_FILTER_KEYS.some((key) => {
    const value = query[key];
    return value !== undefined && value !== null && value !== '';
  });
}

function resolveListPagination(query = {}) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const requested = parseInt(query.pageSize, 10) || 10;
  const maxPageSize = hasExpandedPageSizeFilter(query)
    ? FILTERED_MAX_PAGE_SIZE
    : LIST_MAX_PAGE_SIZE;
  const pageSize = Math.min(Math.max(requested, 1), maxPageSize);
  const offset = (page - 1) * pageSize;

  return { page, pageSize, offset };
}

module.exports = {
  LIST_MAX_PAGE_SIZE,
  FILTERED_MAX_PAGE_SIZE,
  resolveListPagination,
};
