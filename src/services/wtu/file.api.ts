import { apiDelete, apiGet, apiPost } from './client';

/** 获取文件列表 GET /api/files */
export async function getFiles(
  params: {
    page?: number;
    pageSize?: number;
    file_module?: string;
    search?: string;
    main_contract_id?: number;
    sub_contract_id?: number;
    record_id?: number;
  },
  options?: { [key: string]: any },
) {
  return apiGet<API.FileList>('/api/files', params, options);
}

/** 直接上传文件到永久目录 POST /api/files/upload-direct */
export async function uploadFileDirect(data: FormData, options?: { [key: string]: any }) {
  return apiPost<API.FileResponse>('/api/files/upload-direct', data, {
    requestType: 'form',
    ...(options || {}),
  });
}

/** 删除文件 DELETE /api/files/:id */
export async function removeFile(id: number, options?: { [key: string]: any }) {
  return apiDelete<Record<string, any>>(`/api/files/${id}`, options);
}

export interface InvoiceRenamePayload {
  invoice_no?: string;
  seller?: string;
  invoice_date?: string;
  invoice_amount?: number | string;
}

/** 手动触发发票文件结构化重命名 POST /api/files/:id/rename */
export async function renameFile(
  id: number,
  data?: InvoiceRenamePayload,
  options?: { [key: string]: any },
) {
  return apiPost<API.FileResponse>(`/api/files/${id}/rename`, data, {
    skipErrorHandler: true,
    ...(options || {}),
  });
}

/** 获取模块配置 GET /api/files/config/modules */
export async function getModuleConfigs(options?: { [key: string]: any }) {
  return apiGet<API.FileModuleConfigList>('/api/files/config/modules', undefined, options);
}
