import FilePreview from '@/components/FilePreview';
import { COLORS, UI_COLORS } from '@/constants/colors';
import {
  getFiles,
  removeFile,
  renameFile,
  uploadFileDirect,
  type InvoiceRenamePayload,
} from '@/services/wtu/file.api';
import { ocrInvoice } from '@/services/wtu/invoiceIn.api';
import { getErrorMessage } from '@/utils/apiError';
import {
  DeleteOutlined,
  FileOutlined,
  InboxOutlined,
  RedoOutlined,
  ScanOutlined,
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { Alert, Button, Card, message, Popconfirm, Space, Tooltip, Upload } from 'antd';
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

const { Dragger } = Upload;

interface BusinessFileUploaderProps {
  moduleType: string;

  mainContractId?: number;
  subContractId?: number;
  recordId?: number;

  // OCR
  showOcrButton?: boolean;
  onOcrComplete?: (data: any) => void;
  /** 获取当前表单发票字段，用于手动重命名（无 OCR 时） */
  getInvoiceRenameFields?: () => InvoiceRenamePayload | undefined;

  // config
  maxFileSize?: number;
  accept?: string;
  uploadStyle?: 'dragger' | 'button';

  // refresh trigger
  refreshTrigger?: number;
  disabled?: boolean;
  /** 上传成功回调，返回文件 ID */
  onUploadSuccess?: (fileId: number) => void;
  /** 附件列表变更（上传/删除） */
  onFilesChanged?: () => void;
}

export interface BusinessFileUploaderRef {
  fetchFiles: () => void;
  clearAllFiles: () => Promise<void>;
  getFileCount: () => number;
}

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/gif',
];

const DEFAULT_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png';

const hasCompleteRenameFields = (fields?: InvoiceRenamePayload): boolean => {
  if (!fields) return false;
  const invoiceNo = String(fields.invoice_no ?? '').trim();
  if (!invoiceNo || invoiceNo.startsWith('TEMP_')) return false;
  if (!String(fields.seller ?? '').trim()) return false;
  if (!fields.invoice_date) return false;
  const amount = fields.invoice_amount;
  return amount !== null && amount !== undefined && String(amount).trim() !== '';
};

const mapOcrToRenameFields = (data: Record<string, unknown>): InvoiceRenamePayload => ({
  invoice_no: String(data.invoice_no ?? ''),
  seller: String(data.seller ?? ''),
  invoice_date: String(data.invoice_date ?? ''),
  invoice_amount: data.invoice_amount as number | string,
});

const formatFileSize = (size: number): string => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const BusinessFileUploader: React.ForwardRefRenderFunction<
  BusinessFileUploaderRef,
  BusinessFileUploaderProps
> = (
  {
    moduleType,
    mainContractId,
    subContractId,
    recordId,
    showOcrButton = false,
    onOcrComplete,
    getInvoiceRenameFields,
    maxFileSize = 100,
    accept = DEFAULT_ACCEPT,
    uploadStyle = 'dragger',
    refreshTrigger,
    disabled = false,
    onUploadSuccess,
    onFilesChanged,
  },
  ref,
) => {
  const [existingFiles, setExistingFiles] = useState<API.File[]>([]);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewFile, setPreviewFile] = useState<API.File | null>(null);
  // 创建模式下跟踪已上传到 DB 但 record_id=null 的文件ID及数量
  const localUploadIdsRef = useRef<number[]>([]);
  // 跟踪正在重命名的文件 ID
  const [renamingId, setRenamingId] = useState<number | null>(null);
  // 跟踪正在删除的文件 ID（单次只删一个，与 renamingId 对称）
  const [deletingId, setDeletingId] = useState<number | null>(null);
  // 防重入锁
  const isClearingRef = useRef(false);
  // ref 保持最新 existingFiles，避免 clearAllFiles/getFileCount 因依赖变化而重建
  const existingFilesRef = useRef(existingFiles);
  useEffect(() => {
    existingFilesRef.current = existingFiles;
  }, [existingFiles]);

  // ----- fetch files -----
  const fetchFiles = useCallback(async () => {
    // 没有 recordId 时不发起请求（统一按 file_module + record_id 查询）
    if (!recordId) {
      setExistingFiles([]);
      return;
    }

    try {
      const params: any = { file_module: moduleType, pageSize: 200 };
      params.record_id = recordId;

      const response = await getFiles(params);
      if (response.success && response.data) {
        setExistingFiles(response.data as API.File[]);
        // 进入编辑模式后，本地跟踪不再需要（服务端已回填 record_id）
        localUploadIdsRef.current = [];
      }
    } catch (error) {
      message.error(getErrorMessage(error, '文件列表加载失败'));
    }
  }, [moduleType, recordId]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles, refreshTrigger]);

  // ----- rename (structured naming for invoice files) -----
  const performRename = useCallback(
    async (file: API.File, fields?: InvoiceRenamePayload, options?: { silent?: boolean }) => {
      if (!file.id) return false;

      setRenamingId(file.id);
      try {
        const payload = hasCompleteRenameFields(fields) ? fields : undefined;
        const response = await renameFile(file.id, payload);
        if (response.success && response.data) {
          if (!options?.silent) {
            message.success(response.message || '文件重命名成功');
          }
          setExistingFiles((prev) =>
            prev.map((item) => (item.id === file.id ? (response.data as API.File) : item)),
          );
          return true;
        }
        if (!options?.silent) {
          message.error(response.message || '重命名失败');
        }
        return false;
      } catch (error) {
        if (!options?.silent) {
          message.error(getErrorMessage(error, '重命名失败'));
        }
        return false;
      } finally {
        setRenamingId(null);
      }
    },
    [],
  );

  // ----- OCR -----
  const handleOcrRecognize = async (file: API.File) => {
    const filePath = file.file_path;
    if (!filePath) {
      message.error('无效的文件路径');
      return;
    }
    const parts = filePath.replace(/\\/g, '/').split('uploads/');
    if (parts.length < 2) {
      message.error('文件路径格式错误');
      return;
    }
    const relativePath = parts[1];

    try {
      setOcrLoading(true);
      message.loading({ content: '正在识别...', key: 'ocr', duration: 0 });

      const response = await ocrInvoice({ filePath: relativePath } as any);

      if (response.success && response.data) {
        if (onOcrComplete) onOcrComplete(response.data);

        const renameFields = mapOcrToRenameFields(response.data);
        if (hasCompleteRenameFields(renameFields)) {
          message.loading({ content: '识别完成，正在重命名文件...', key: 'ocr', duration: 0 });
          const renamed = await performRename(file, renameFields, { silent: true });
          message.success({
            content: renamed ? '识别完成，文件已重命名' : '识别完成，但文件重命名失败',
            key: 'ocr',
          });
        } else {
          message.success({ content: '识别完成', key: 'ocr' });
          message.warning('识别结果不完整，请补充发票信息后手动重命名');
        }
      } else {
        message.error({ content: response.message || '识别失败', key: 'ocr' });
      }
    } catch (error) {
      message.error({ content: getErrorMessage(error, '识别失败'), key: 'ocr' });
    } finally {
      setOcrLoading(false);
    }
  };

  // ----- upload (direct to permanent) -----
  const handleUpload = useCallback(
    async (file: File): Promise<boolean> => {
      setUploadingCount((c) => c + 1);
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('file_module', moduleType);
        if (mainContractId !== undefined)
          formData.append('main_contract_id', String(mainContractId));

        if (subContractId) formData.append('sub_contract_id', String(subContractId));
        if (recordId) formData.append('record_id', String(recordId));

        const response = await uploadFileDirect(formData);

        if (response.success && response.data) {
          message.success(`${file.name} 上传成功`);
          // optimistic update：将新文件追加到本地列表顶部
          setExistingFiles((prev) => [response.data as API.File, ...prev]);
          if (!recordId && response.data.id) {
            localUploadIdsRef.current.push(response.data.id);
          }
          if (response.data.id) {
            onUploadSuccess?.(response.data.id);
          }
          onFilesChanged?.();

          return true;
        }
        throw new Error(response.message || '上传失败');
      } catch (error) {
        message.error(`${file.name} ${getErrorMessage(error, '上传失败')}`);
        return false;
      } finally {
        setUploadingCount((c) => c - 1);
      }
    },
    [moduleType, mainContractId, subContractId, recordId, onUploadSuccess, onFilesChanged],
  );

  // ----- clear all files -----
  const clearAllFiles = useCallback(async () => {
    if (isClearingRef.current) return;
    isClearingRef.current = true;
    try {
      const ids = existingFilesRef.current.map((f) => f.id).filter(Boolean) as number[];
      // 合并创建模式下本地跟踪的未回填文件
      const allIds = [...new Set([...ids, ...localUploadIdsRef.current])];
      if (allIds.length === 0) return;

      message.loading({ content: '正在清除文件...', key: 'clearFiles', duration: 0 });
      const results = await Promise.allSettled(allIds.map((id) => removeFile(id)));
      const successIds = new Set(
        results.map((r, i) => (r.status === 'fulfilled' ? allIds[i] : null)).filter(Boolean),
      );
      const failed = allIds.length - successIds.size;
      setExistingFiles((prev) => prev.filter((f) => !successIds.has(f.id!)));
      localUploadIdsRef.current = localUploadIdsRef.current.filter((id) => !successIds.has(id));
      if (failed === 0) {
        message.success({ content: `已清除 ${allIds.length} 个文件`, key: 'clearFiles' });
      } else {
        message.warning({
          content: `${failed}/${allIds.length} 个文件删除失败`,
          key: 'clearFiles',
        });
      }
    } finally {
      isClearingRef.current = false;
    }
  }, []);

  const handleRename = async (file: API.File, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!file.id || renamingId) return;

    const fields = getInvoiceRenameFields?.();
    if (!hasCompleteRenameFields(fields)) {
      message.warning('请先填写发票号码、销售方、开票日期和金额后再重命名');
      return;
    }

    await performRename(file, fields);
  };

  // ----- delete single file -----
  const handleDeleteFile = async (fileId: number) => {
    // 乐观移除前通过 ref 获取最新快照，回滚时保持原顺序
    const snapshot = existingFilesRef.current;
    setDeletingId(fileId);
    setExistingFiles((prev) => prev.filter((f) => f.id !== fileId));
    try {
      await removeFile(fileId);
      message.success('文件删除成功');
      onFilesChanged?.();
    } catch {
      setExistingFiles(snapshot);
      message.error('文件删除失败');
    } finally {
      setDeletingId(null);
    }
  };

  // ----- expose ref -----
  useImperativeHandle(
    ref,
    () => ({
      fetchFiles,
      clearAllFiles,
      getFileCount: () => existingFilesRef.current.length + localUploadIdsRef.current.length,
    }),
    [fetchFiles, clearAllFiles],
  );

  // ----- uploadProps -----
  const uploadProps = useMemo<UploadProps>(
    () => ({
      name: 'file',
      multiple: true,
      showUploadList: false,
      accept,
      disabled: uploadingCount > 0 || !mainContractId || disabled,
      beforeUpload: (file: File) => {
        if (disabled) {
          message.warning('请先保存记录，然后才能上传附件');
          return Upload.LIST_IGNORE;
        }
        if (!mainContractId) {
          message.warning('请先选择关联合同');
          return Upload.LIST_IGNORE;
        }
        const isLtMaxSize = file.size / 1024 / 1024 < maxFileSize;
        if (!isLtMaxSize) {
          message.error(`文件大小不能超过 ${maxFileSize}MB!`);
          return Upload.LIST_IGNORE;
        }

        if (!ALLOWED_TYPES.includes(file.type) && file.type) {
          message.error('只支持上传 PDF、Word、Excel、图片格式的文件');
          return Upload.LIST_IGNORE;
        }

        handleUpload(file);
        return false;
      },
    }),
    [accept, disabled, mainContractId, maxFileSize, uploadingCount, handleUpload],
  );

  // ----- UI -----
  const renderUploadArea = () => {
    const uploadNode =
      uploadStyle === 'button' ? (
        <Upload {...uploadProps}>
          <Button icon={<InboxOutlined />} loading={uploadingCount > 0}>
            上传文件
          </Button>
        </Upload>
      ) : (
        <Dragger {...uploadProps} style={{ minHeight: '120px' }}>
          <p className="ant-upload-drag-icon" style={{ fontSize: '32px', marginBottom: '8px' }}>
            <InboxOutlined />
          </p>
          <p className="ant-upload-text" style={{ fontSize: '14px', marginBottom: '4px' }}>
            点击或拖拽文件到此区域上传
          </p>
          <p className="ant-upload-hint" style={{ fontSize: '12px', margin: 0 }}>
            支持 PDF、Word、Excel、图片格式，文件大小不超过{maxFileSize}MB
          </p>
        </Dragger>
      );

    return (
      <>
        {disabled ? (
          <Alert
            description="请先保存记录，然后才能上传附件"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        ) : !mainContractId ? (
          <Alert
            description="请先选择关联合同，然后才能上传附件"
            type="info"
            style={{ marginBottom: 16 }}
          />
        ) : null}
        {uploadNode}
      </>
    );
  };

  const renderFileItem = (file: API.File) => (
    <div
      key={file.id}
      style={{
        padding: '10px 12px',
        marginBottom: '8px',
        background: COLORS.bgSubtle,
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
      }}
      onClick={() => {
        if (file.file_path) {
          setPreviewFile(file);
          setPreviewVisible(true);
        }
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
          <FileOutlined
            style={{ marginRight: '8px', color: UI_COLORS.attachment, flexShrink: 0 }}
          />
          <span
            style={{
              fontWeight: 500,
              fontSize: '13px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {file.original_filename}
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '12px',
            color: COLORS.textTertiary,
          }}
        >
          <span>{file.file_size ? formatFileSize(file.file_size) : '-'}</span>
          <Space size="small" onClick={(e) => e.stopPropagation()}>
            {showOcrButton && (moduleType === 'FB_INVOICE' || moduleType === 'ZB_INVOICE') && (
              <Tooltip title="结构化重命名">
                <Button
                  type="text"
                  size="small"
                  icon={<RedoOutlined />}
                  loading={renamingId === file.id}
                  style={{ color: COLORS.success }}
                  onClick={(e) => handleRename(file, e)}
                />
              </Tooltip>
            )}
            {showOcrButton && file.original_filename?.toLowerCase().endsWith('.pdf') && (
              <Tooltip title="识别发票">
                <Button
                  type="text"
                  size="small"
                  icon={<ScanOutlined />}
                  loading={ocrLoading}
                  style={{ color: UI_COLORS.action }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOcrRecognize(file);
                  }}
                />
              </Tooltip>
            )}
            <Popconfirm
              title="确定删除该文件吗？"
              onConfirm={() => {
                if (file.id) handleDeleteFile(file.id);
              }}
            >
              <Tooltip title="删除">
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  loading={deletingId === file.id}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      {/* upload area */}
      {renderUploadArea()}

      {/* existing files */}
      {existingFiles.length > 0 && (
        <Card title={`已上传文件 (${existingFiles.length})`} size="small" style={{ marginTop: 16 }}>
          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {existingFiles.map(renderFileItem)}
          </div>
        </Card>
      )}

      {/* file preview */}
      {previewFile && (
        <FilePreview
          visible={previewVisible}
          fileUrl={previewFile.file_path?.replace(/\\/g, '/') || ''}
          fileName={previewFile.original_filename || ''}
          fileType={previewFile.file_type || ''}
          onClose={() => {
            setPreviewVisible(false);
            setPreviewFile(null);
          }}
        />
      )}
    </div>
  );
};

export default forwardRef(BusinessFileUploader);
