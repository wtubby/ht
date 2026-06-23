const INVOICE_DUPLICATE_CODE = 3001;

/** 与 backend/src/utils/errorCodes.js 认证段保持一致 */
export const AUTH_ERROR_CODE = {
  INVALID_CREDENTIALS: 2001,
} as const;

/** umi-request / axios 等常见 API 错误结构 */
interface ApiErrorPayload {
  errorMessage?: string;
  message?: string;
  errorCode?: number;
}

interface ApiRequestError {
  name?: string;
  isAuthError?: boolean;
  info?: ApiErrorPayload;
  response?: { status?: number; data?: ApiErrorPayload };
  data?: ApiErrorPayload;
  message?: string;
}

function getResponseErrorCode(error: ApiRequestError): number | undefined {
  return error.response?.data?.errorCode ?? error.data?.errorCode ?? error.info?.errorCode;
}

/** 401 且非凭据错误（登录/改密输错），视为会话失效 */
export function isSessionAuthError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as ApiRequestError;
  if (e.response?.status !== 401) return false;
  const errorCode = getResponseErrorCode(e);
  return errorCode !== AUTH_ERROR_CODE.INVALID_CREDENTIALS;
}

/** 是否为登录失效，业务层应跳过重复错误提示 */
export function isAuthError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as ApiRequestError;
  return !!e.isAuthError || isSessionAuthError(error);
}

function extractApiErrorPayload(error: ApiRequestError): ApiErrorPayload | undefined {
  return error.info ?? error.response?.data ?? error.data;
}

/** 是否为发票号码重复错误 */
export function isInvoiceDuplicateError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const payload = extractApiErrorPayload(error as ApiRequestError);
  if (payload?.errorCode === INVOICE_DUPLICATE_CODE) return true;
  const msg = payload?.message ?? payload?.errorMessage ?? '';
  return /发票号码.*(已存在|重复)/.test(msg);
}

/** 从 API 请求错误中提取可展示的消息 */
export function getErrorMessage(error: unknown, defaultMsg = '操作失败，请重试'): string {
  if (isAuthError(error)) {
    return '';
  }
  if (!error || typeof error !== 'object') {
    return defaultMsg;
  }
  const e = error as ApiRequestError;
  const payload = extractApiErrorPayload(e);
  const msg = payload?.errorMessage ?? payload?.message;
  if (msg) {
    return msg;
  }
  if (isInvoiceDuplicateError(error)) {
    return '该发票号码已存在，请更换后重试';
  }
  if (typeof e.message === 'string' && e.message) {
    return e.message;
  }
  return defaultMsg;
}
