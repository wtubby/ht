import { useCallback, useState } from 'react';

export interface PreviewFile {
  url: string;
  name: string;
  type: string;
}

export function useFilePreview() {
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null);

  const handleFilePreview = useCallback((file: API.File) => {
    if (!file.file_path) return;
    setPreviewFile({
      url: file.file_path.replace(/\\/g, '/'),
      name: file.original_filename || '文件',
      type: file.file_type || 'unknown',
    });
    setPreviewVisible(true);
  }, []);

  const handlePreviewClose = useCallback(() => {
    setPreviewVisible(false);
    setPreviewFile(null);
  }, []);

  return {
    previewVisible,
    previewFile,
    handleFilePreview,
    handlePreviewClose,
  };
}
