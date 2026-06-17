import { history } from '@umijs/max';

const LOGIN_PATH = '/user/login';
const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

function getStorageWithKey(key: string): Storage | null {
  if (localStorage.getItem(key)) {
    return localStorage;
  }
  if (sessionStorage.getItem(key)) {
    return sessionStorage;
  }
  return null;
}

/** 当前 token 所在的 storage（优先 localStorage） */
export function getAuthStorage(): Storage | null {
  return getStorageWithKey(ACCESS_TOKEN_KEY) || getStorageWithKey(REFRESH_TOKEN_KEY);
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY) || sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY) || sessionStorage.getItem(REFRESH_TOKEN_KEY);
}

export function hasAccessToken(): boolean {
  return !!getAccessToken();
}

/** 登录成功后写入 token；persistent 为 true 用 localStorage，否则 sessionStorage */
export function setAuthTokens(tokens: {
  accessToken: string;
  refreshToken?: string;
  persistent: boolean;
}) {
  const storage = tokens.persistent ? localStorage : sessionStorage;
  const other = tokens.persistent ? sessionStorage : localStorage;

  other.removeItem(ACCESS_TOKEN_KEY);
  other.removeItem(REFRESH_TOKEN_KEY);

  storage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  if (tokens.refreshToken) {
    storage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  } else {
    storage.removeItem(REFRESH_TOKEN_KEY);
  }
}

/** 刷新 accessToken 后写回同一 storage */
export function setAccessToken(accessToken: string) {
  const storage = getAuthStorage() ?? localStorage;
  storage.setItem(ACCESS_TOKEN_KEY, accessToken);
}

/** 清除两个 storage 中的认证 token */
export function clearAuthTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
}

/**
 * 跳转登录页
 * @param hard true 时整页刷新以重置应用状态；false 时使用 SPA 路由跳转
 */
export function redirectToLogin(hard = true) {
  if (window.location.pathname === LOGIN_PATH) {
    return;
  }
  if (hard) {
    window.location.replace(LOGIN_PATH);
    return;
  }
  history.push(LOGIN_PATH);
}

export { LOGIN_PATH };
