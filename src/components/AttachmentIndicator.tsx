import { FileTextOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import type { CSSProperties, FC } from 'react';

interface AttachmentIndicatorProps {
  visible?: boolean;
  title: string;
  color: string;
  style?: CSSProperties;
}

const AttachmentIndicator: FC<AttachmentIndicatorProps> = ({ visible, title, color, style }) => (
  <span style={{ width: 16, flexShrink: 0, display: 'inline-flex', ...style }}>
    {visible && (
      <Tooltip title={title}>
        <FileTextOutlined style={{ color, fontSize: '16px' }} />
      </Tooltip>
    )}
  </span>
);

export default AttachmentIndicator;
