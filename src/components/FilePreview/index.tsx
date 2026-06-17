import { COLORS } from '@/constants/colors';
import { CloseOutlined, DownloadOutlined } from '@ant-design/icons';
import { Button, message, Modal, Spin } from 'antd';
import React, { useEffect, useState } from 'react';

interface FilePreviewProps {
  visible: boolean;
  fileUrl: string;
  fileName: string;
  fileType?: string;
  onClose: () => void;
}

const FilePreview: React.FC<FilePreviewProps> = ({
  visible,
  fileUrl,
  fileName,
  fileType,
  onClose,
}) => {
  const [blobUrl, setBlobUrl] = useState<string>('');
  const [textContent, setTextContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // 根据文件扩展名或 MIME 类型判断文件类型
  const getFileType = () => {
    if (fileType) {
      if (fileType.includes('pdf')) return 'pdf';
      if (fileType.includes('image')) return 'image';
      if (fileType.includes('video')) return 'video';
      if (fileType.includes('audio')) return 'audio';
      if (fileType.includes('text')) return 'text';
      if (fileType.includes('word') || fileType.includes('document')) return 'word';
      if (fileType.includes('excel') || fileType.includes('spreadsheet')) return 'excel';
    }

    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext || '')) return 'image';
    if (['mp4', 'webm', 'ogg', 'avi', 'mov'].includes(ext || '')) return 'video';
    if (['mp3', 'wav', 'ogg', 'aac'].includes(ext || '')) return 'audio';
    if (
      ['txt', 'json', 'js', 'jsx', 'ts', 'tsx', 'html', 'css', 'xml', 'md', 'log'].includes(
        ext || '',
      )
    )
      return 'text';
    if (['doc', 'docx'].includes(ext || '')) return 'word';
    if (['xls', 'xlsx'].includes(ext || '')) return 'excel';

    return 'unknown';
  };

  const type = getFileType();
  const token = localStorage.getItem('token');

  // 处理文件 URL,确保使用完整的后端服务器地址
  const getFullUrl = (url: string) => {
    // 如果已经是完整 URL,直接返回
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    // 获取后端服务器地址
    const backendUrl =
      process.env.NODE_ENV === 'development'
        ? 'http://localhost:3001' // 开发环境使用后端服务器地址
        : window.location.origin; // 生产环境使用当前域名

    // 确保路径以 / 开头
    const path = url.startsWith('/') ? url : `/${url}`;

    // 拼接完整的后端服务器地址
    return `${backendUrl}${path}`;
  };

  const fullUrl = getFullUrl(fileUrl);
  const previewUrl = `${fullUrl}${fullUrl.includes('?') ? '&' : '?'}token=${token}`;

  // 加载文件并创建 Blob URL
  useEffect(() => {
    // 重置状态
    setBlobUrl('');
    setTextContent('');
    setLoading(false);

    if (!visible) {
      return;
    }

    // 不需要预览的类型
    if (type === 'word' || type === 'excel' || type === 'unknown') {
      return;
    }

    const loadFile = async () => {
      setLoading(true);
      try {
        const response = await fetch(previewUrl);

        if (!response.ok) {
          throw new Error(`文件加载失败: ${response.status} ${response.statusText}`);
        }

        // 如果是文本文件，直接读取内容
        if (type === 'text') {
          const text = await response.text();
          setTextContent(text);
        } else {
          // 其他文件转换为 Blob URL
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          setBlobUrl(url);
        }
      } catch (error) {
        message.error(`文件加载失败: ${error instanceof Error ? error.message : '未知错误'}`);
      } finally {
        setLoading(false);
      }
    };

    loadFile();

    // 清理 Blob URL
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [visible, previewUrl, type]); // 移除 blobUrl 依赖

  // 下载文件
  const handleDownload = () => {
    // 使用 a 标签下载，避免路由拦截
    const link = document.createElement('a');
    link.href = previewUrl;
    link.download = fileName;
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success('开始下载');
  };

  // 渲染预览内容
  const renderPreviewContent = () => {
    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: '100px 20px' }}>
          <Spin size="large" tip="加载中..." />
        </div>
      );
    }

    switch (type) {
      case 'pdf':
        return (
          <iframe
            src={blobUrl}
            style={{ width: '100%', height: '600px', border: 'none' }}
            title={fileName}
          />
        );

      case 'image':
        return (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <img
              src={blobUrl}
              alt={fileName}
              style={{ maxWidth: '100%', maxHeight: '600px', objectFit: 'contain' }}
            />
          </div>
        );

      case 'video':
        return (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <video controls style={{ maxWidth: '100%', maxHeight: '600px' }} src={blobUrl}>
              您的浏览器不支持视频播放
            </video>
          </div>
        );

      case 'audio':
        return (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>🎵</div>
            <div style={{ fontSize: '16px', color: COLORS.textSecondary, marginBottom: '20px' }}>
              {fileName}
            </div>
            <audio controls style={{ width: '100%', maxWidth: '500px' }} src={blobUrl}>
              您的浏览器不支持音频播放
            </audio>
          </div>
        );

      case 'text':
        return (
          <pre
            style={{
              padding: '20px',
              margin: '0',
              maxHeight: '600px',
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
              backgroundColor: COLORS.bgHover,
              borderRadius: '4px',
              fontSize: '14px',
              lineHeight: '1.6',
            }}
          >
            {textContent}
          </pre>
        );

      case 'word':
      case 'excel':
        return (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              background: COLORS.bgSubtle,
              borderRadius: '8px',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
            <div style={{ fontSize: '16px', color: COLORS.textSecondary, marginBottom: '8px' }}>
              {fileName}
            </div>
            <div style={{ fontSize: '14px', color: COLORS.textTertiary, marginBottom: '24px' }}>
              {type === 'word' ? 'Word 文档' : 'Excel 表格'}暂不支持在线预览
            </div>
            <Button type="primary" icon={<DownloadOutlined />} onClick={handleDownload}>
              下载查看
            </Button>
          </div>
        );

      default:
        return (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              background: COLORS.bgSubtle,
              borderRadius: '8px',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📎</div>
            <div style={{ fontSize: '16px', color: COLORS.textSecondary, marginBottom: '8px' }}>
              {fileName}
            </div>
            <div style={{ fontSize: '14px', color: COLORS.textTertiary, marginBottom: '24px' }}>
              此文件类型暂不支持在线预览
            </div>
            <Button type="primary" icon={<DownloadOutlined />} onClick={handleDownload}>
              下载查看
            </Button>
          </div>
        );
    }
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>文件预览 - {fileName}</span>
          <Button
            type="text"
            icon={<DownloadOutlined />}
            onClick={handleDownload}
            style={{ marginRight: '8px' }}
          >
            下载
          </Button>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>,
      ]}
      width={1000}
      centered
      styles={{
        body: { padding: '0' },
      }}
      closeIcon={<CloseOutlined />}
    >
      {renderPreviewContent()}
    </Modal>
  );
};

export default FilePreview;
