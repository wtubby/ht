import FilePreview from '@/components/FilePreview';
import { MODULE_COLORS, UI_COLORS } from '@/constants/colors';
import { fileModuleTagColor } from '@/constants/statusColors';
import { getFiles, getModuleConfigs, removeFile } from '@/services/wtu/file.api';
import { getErrorMessage } from '@/utils/apiError';
import { getFileDownloadUrl } from '@/utils/fileUtils';
import {
  DeleteOutlined,
  DownloadOutlined,
  FileOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { App, Input, Select, Space, Tag, Tooltip } from 'antd';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// 文件大小格式化（模块级纯函数，避免每次渲染重建）
const formatFileSize = (bytes: number): string => {
  if (bytes == null || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

const FileList: React.FC = () => {
  const { message: antdMessage, modal } = App.useApp();
  const actionRef = useRef<ActionType>();
  const searchTextRef = useRef<string>('');
  const [moduleFilter, setModuleFilter] = useState<string | undefined>(undefined);
  const moduleFilterRef = useRef(moduleFilter);
  moduleFilterRef.current = moduleFilter;
  const [moduleConfigs, setModuleConfigs] = useState<API.FileModuleConfig[]>([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewFile, setPreviewFile] = useState<API.File | null>(null);
  const previewFileRef = useRef(previewFile);
  previewFileRef.current = previewFile;

  // 获取模块配置
  useEffect(() => {
    let cancelled = false;
    const fetchConfigs = async () => {
      try {
        const response = await getModuleConfigs();
        if (!cancelled && response.success) {
          setModuleConfigs(response.data);
        }
      } catch (error) {
        antdMessage.error(getErrorMessage(error, '获取模块配置失败'));
      }
    };
    fetchConfigs();
    return () => {
      cancelled = true;
    };
  }, [antdMessage]);

  // 使用 useMemo 构建模块名称映射，避免每次渲染遍历
  const moduleNameMap = useMemo(
    () => new Map(moduleConfigs.map((c) => [c.file_module, c.description])),
    [moduleConfigs],
  );

  const handleOpenPreview = useCallback((record: API.File) => {
    setPreviewFile(record);
    setPreviewVisible(true);
  }, []);

  // 删除文件
  const handleRemove = useCallback(
    async (record: API.File) => {
      try {
        await removeFile(record.id!, { skipErrorHandler: true });
        antdMessage.success('删除成功');
        if (previewFileRef.current?.id === record.id) {
          setPreviewVisible(false);
          setPreviewFile(null);
        }
        actionRef.current?.reload();
      } catch (error) {
        antdMessage.error(getErrorMessage(error, '删除失败，请重试'));
        throw error;
      }
    },
    [antdMessage],
  );

  // 下载文件
  const handleDownload = useCallback(
    (record: API.File) => {
      if (record.file_path) {
        const downloadUrl = getFileDownloadUrl(record.file_path);
        // 使用 a 标签下载，避免 window.open 被拦截
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = record.original_filename || '';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        antdMessage.error('文件路径不存在');
      }
    },
    [antdMessage],
  );

  const fetchFiles = useCallback(async (params: API.PageParams) => {
    const response = await getFiles({
      page: params.current,
      pageSize: params.pageSize,
      file_module: moduleFilterRef.current || undefined,
      search: searchTextRef.current || undefined,
    });
    return {
      data: response.data,
      success: response.success,
      total: response.total,
    };
  }, []);

  // 使用 useMemo 缓存 columns，避免每次渲染重建
  const columns: ProColumns<API.File>[] = useMemo(
    () => [
      {
        title: 'ID',
        dataIndex: 'id',
        search: false,
        width: 40,
        align: 'center',
      },
      {
        title: '文件名',
        dataIndex: 'original_filename',
        width: 300,
        render: (_, record) => (
          <Space align="start">
            <FileOutlined style={{ color: MODULE_COLORS.file.color, marginTop: 2 }} />
            <Tooltip title={record.original_filename}>
              <a
                href="#"
                role="button"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  whiteSpace: 'normal',
                  wordBreak: 'break-all',
                  lineHeight: 1.5,
                }}
                onClick={(e) => {
                  e.preventDefault();
                  handleOpenPreview(record);
                }}
              >
                {record.original_filename}
              </a>
            </Tooltip>
          </Space>
        ),
      },
      {
        title: '所属模块',
        dataIndex: 'file_module',
        width: 70,
        align: 'center',
        render: (_, record) => (
          <Tag color={fileModuleTagColor}>
            {moduleNameMap.get(record.file_module) || record.file_module}
          </Tag>
        ),
      },
      {
        title: '合同名称',
        dataIndex: 'contract_name',
        width: 250,
        ellipsis: true,
        render: (_, record) => {
          // 优先显示分包合同，没有分包合同则显示总包合同
          const contractName =
            record.subContract?.contract_name || record.mainContract?.contract_name || '-';
          return (
            <Tooltip title={contractName}>
              <span>{contractName}</span>
            </Tooltip>
          );
        },
      },
      {
        title: '文件大小',
        dataIndex: 'file_size',
        search: false,
        width: 80,
        align: 'right',
        render: (_, record) => formatFileSize(record.file_size),
      },
      {
        title: '文件类型',
        dataIndex: 'file_type',
        search: false,
        width: 100,
        ellipsis: true,
        render: (text) => text || '-',
      },

      {
        title: '上传时间',
        dataIndex: 'uploaded_at',
        valueType: 'dateTime',
        search: false,
        width: 140,
        render: (_, record) => record.uploaded_at || '-',
      },
      {
        title: '上传人',
        dataIndex: ['uploader', 'username'],
        search: false,
        align: 'center',
        width: 80,
        render: (_, record) => record.uploader?.full_name || record.uploader?.username || '-',
      },
      {
        title: '操作',
        dataIndex: 'option',
        valueType: 'option',
        align: 'center',
        fixed: 'right',
        width: 80,
        render: (_, record) => [
          <Tooltip key="download" title="下载">
            <DownloadOutlined
              style={{
                fontSize: '16px',
                color: UI_COLORS.action,
                cursor: 'pointer',
              }}
              onClick={() => handleDownload(record)}
            />
          </Tooltip>,
          <Tooltip key="delete" title="删除">
            <DeleteOutlined
              style={{
                fontSize: '16px',
                color: UI_COLORS.actionDanger,
                cursor: 'pointer',
                marginLeft: '12px',
              }}
              onClick={() => {
                modal.confirm({
                  title: '确认删除',
                  content: `您确定要删除文件“${record.original_filename}”吗？此操作不可恢复。`,
                  onOk: () => handleRemove(record),
                });
              }}
            />
          </Tooltip>,
        ],
      },
    ],
    [moduleNameMap, handleDownload, handleOpenPreview, handleRemove, modal],
  );

  return (
    <PageContainer pageHeaderRender={false}>
      <ProTable<API.File, API.PageParams>
        headerTitle="文件管理"
        actionRef={actionRef}
        rowKey="id"
        search={false}
        toolBarRender={() => [
          <Select
            key="module"
            placeholder="选择模块"
            allowClear
            style={{ width: 150 }}
            value={moduleFilter}
            onChange={(value) => {
              setModuleFilter(value);
              actionRef.current?.reload();
            }}
          >
            {moduleConfigs.map((config) => (
              <Select.Option key={config.file_module} value={config.file_module}>
                {config.description}
              </Select.Option>
            ))}
          </Select>,
          <Input.Search
            key="search"
            placeholder="搜索文件名"
            allowClear
            enterButton={<SearchOutlined />}
            onSearch={(value) => {
              searchTextRef.current = value;
              actionRef.current?.reload();
            }}
            style={{ width: 250 }}
          />,
        ]}
        request={fetchFiles}
        columns={columns}
        scroll={{ x: 1400 }}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
        }}
        locale={{ emptyText: '还没有文件，请在各业务单据中上传附件后在此查看' }}
      />

      {/* 文件预览组件 */}
      {previewFile && (
        <FilePreview
          visible={previewVisible}
          fileUrl={getFileDownloadUrl(previewFile.file_path || '')}
          fileName={previewFile.original_filename || ''}
          fileType={previewFile.file_type || ''}
          onClose={() => {
            setPreviewVisible(false);
            setPreviewFile(null);
          }}
        />
      )}
    </PageContainer>
  );
};

export default FileList;
