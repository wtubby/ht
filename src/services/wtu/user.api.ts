import { getRefreshToken } from '@/utils/auth';
import { apiGet, apiPost } from './client';

/** 登录 POST /api/auth/login */
export async function login(body: API.LoginParams, options?: Record<string, unknown>) {
  return apiPost<API.LoginResult>('/api/auth/login', body, options);
}

/** 获取当前用户信息 GET /api/auth/currentUser */
export async function getCurrentUser(options?: Record<string, unknown>) {
  return apiGet<{ data: API.CurrentUser }>('/api/auth/currentUser', undefined, options);
}

/** 退出登录 POST /api/auth/logout */
export async function logout(options?: Record<string, unknown>) {
  const refreshToken = getRefreshToken();
  return apiPost<Record<string, unknown>>(
    '/api/auth/logout',
    refreshToken ? { refreshToken } : {},
    { skipErrorHandler: true, ...options },
  );
}

/** 更新用户密码 POST /api/auth/updatePassword */
export async function updatePassword(data: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ message: string }> {
  return apiPost<{ message: string }>('/api/auth/updatePassword', data);
}
