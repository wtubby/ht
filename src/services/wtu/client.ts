import { request } from '@umijs/max';

type RequestOptions = Record<string, unknown>;

export function apiGet<T>(url: string, params?: Record<string, unknown>, options?: RequestOptions) {
  return request<T>(url, {
    method: 'GET',
    params,
    ...(options || {}),
  });
}

export function apiPost<T>(url: string, data?: unknown, options?: RequestOptions) {
  return request<T>(url, {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

export function apiPut<T>(url: string, data?: unknown, options?: RequestOptions) {
  return request<T>(url, {
    method: 'PUT',
    data,
    ...(options || {}),
  });
}

export function apiDelete<T>(url: string, options?: RequestOptions) {
  return request<T>(url, {
    method: 'DELETE',
    ...(options || {}),
  });
}
