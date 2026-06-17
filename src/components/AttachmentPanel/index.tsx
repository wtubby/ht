import { COLORS, UI_COLORS } from '@/constants/colors';
import { FileDoneOutlined } from '@ant-design/icons';
import { Card, Space } from 'antd';
import React, { useCallback, useState } from 'react';

export interface AttachmentPanelProps {
  title: string;
  files: API.File[];
  onPreview: (file: API.File) => void;
  /** 标题与文件项图标颜色，默认主操作色 */
  iconColor?: string;
  /** 文件项图标，默认 FileDoneOutlined */
  fileIcon?: React.ReactNode;
}

const formatFileSize = (size?: number | null) => {
  if (!size) return '-';
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
};

const formatFileDate = (date?: string | null) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString();
};

const FileItem: React.FC<{
  file: API.File;
  iconColor: string;
  fileIcon: React.ReactNode;
  onPreview: (file: API.File) => void;
}> = React.memo(({ file, iconColor, fileIcon, onPreview }) => {
  const [hovered, setHovered] = useState(false);
  const handleClick = useCallback(() => onPreview(file), [file, onPreview]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: '10px 14px',
        background: hovered ? COLORS.bgHover : COLORS.bgContainer,
        borderRadius: '6px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        border: `1px solid ${COLORS.border}`,
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleClick}
    >
      <div
        style={{
          fontSize: '13px',
          color: COLORS.text,
          marginBottom: '4px',
          fontWeight: 500,
        }}
      >
        <span style={{ marginRight: '6px', color: iconColor }}>{fileIcon}</span>
        {file.original_filename}
      </div>
      <div style={{ fontSize: '11px', color: COLORS.textTertiary, marginLeft: '16px' }}>
        {formatFileSize(file.file_size)}
        {' · '}
        {formatFileDate(file.created_at)}
      </div>
    </div>
  );
});

FileItem.displayName = 'AttachmentPanelFileItem';

const AttachmentPanel: React.FC<AttachmentPanelProps> = ({
  title,
  files,
  onPreview,
  iconColor = UI_COLORS.attachment,
  fileIcon = <FileDoneOutlined />,
}) => (
  <Card
    variant="borderless"
    style={{ borderRadius: '10px', minHeight: '600px' }}
    styles={{ body: { padding: '24px' } }}
  >
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
      }}
    >
      <h3 style={{ fontSize: '16px', fontWeight: 600, color: COLORS.text, margin: 0 }}>
        <span style={{ marginRight: '8px', color: iconColor }}>{fileIcon}</span>
        {title}
      </h3>
      <span style={{ fontSize: '12px', color: COLORS.textTertiary }}>{files.length} 个文件</span>
    </div>

    <div style={{ maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
      {files.length > 0 ? (
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          {files.map((file) => (
            <FileItem
              key={file.id}
              file={file}
              iconColor={iconColor}
              fileIcon={fileIcon}
              onPreview={onPreview}
            />
          ))}
        </Space>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: COLORS.borderMuted }}>
          <div style={{ fontSize: '14px' }}>暂无附件</div>
        </div>
      )}
    </div>
  </Card>
);

export default AttachmentPanel;
