/**
 * 统一处理文件路径
 * 将不同格式的文件路径转换为统一的相对路径格式
 */
export const normalizeFilePath = (filePath: string): string => {
  if (!filePath) return '';

  // 统一替换反斜杠为正斜杠
  const normalizedPath = filePath.replace(/\\/g, '/');

  // 如果路径包含 'uploads/'，提取其后的部分
  const uploadsIndex = normalizedPath.indexOf('uploads/');
  if (uploadsIndex !== -1) {
    return `/${normalizedPath.substring(uploadsIndex)}`;
  }

  // 如果已经是绝对路径，直接返回
  if (normalizedPath.startsWith('/')) {
    return normalizedPath;
  }

  // 其他情况添加前导斜杠
  return `/${normalizedPath}`;
};

/**
 * 获取文件下载URL
 */
export const getFileDownloadUrl = (filePath: string): string => {
  const normalizedPath = normalizeFilePath(filePath);
  return normalizedPath;
};
