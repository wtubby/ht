import FilePreview from '@/components/FilePreview';
import type { PreviewFile } from '@/hooks/useFilePreview';
import React from 'react';

export interface FilePreviewAreaProps {
  previewVisible: boolean;
  previewFile: PreviewFile | null;
  onClose: () => void;
}

const FilePreviewArea: React.FC<FilePreviewAreaProps> = ({
  previewVisible,
  previewFile,
  onClose,
}) => {
  if (!previewFile) return null;

  return (
    <FilePreview
      visible={previewVisible}
      fileUrl={previewFile.url}
      fileName={previewFile.name}
      fileType={previewFile.type}
      onClose={onClose}
    />
  );
};

export default FilePreviewArea;
