import { apiGet, apiPut } from './client';

export interface PublicSystemSettings {
  system_name: string;
  system_logo: string | null;
  ocr_enabled: boolean;
}

export interface SystemSettings extends PublicSystemSettings {
  id: number;
  baidu_ocr_api_key: string | null;
  baidu_ocr_secret_key: string | null;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
}

export async function getPublicSystemSettings(options?: Record<string, unknown>) {
  return apiGet<{ success: boolean; data: PublicSystemSettings }>(
    '/api/system-settings/public',
    undefined,
    { ...(options || {}), skipAuth: true },
  );
}

export async function getSystemSettings(options?: Record<string, unknown>) {
  return apiGet<{ success: boolean; data: SystemSettings }>(
    '/api/system-settings',
    undefined,
    options,
  );
}

export async function updateSystemSettings(
  data: Partial<
    Pick<
      SystemSettings,
      'system_name' | 'system_logo' | 'baidu_ocr_api_key' | 'baidu_ocr_secret_key' | 'ocr_enabled'
    >
  >,
  options?: Record<string, unknown>,
) {
  return apiPut<{ success: boolean; data: SystemSettings; message: string }>(
    '/api/system-settings',
    data,
    options,
  );
}
