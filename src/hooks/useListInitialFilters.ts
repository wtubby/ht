import type { ProFormInstance } from '@ant-design/pro-components';
import { useEffect, useRef } from 'react';

/**
 * 将 URL 带入的初始筛选写入 ProTable 搜索表单并触发查询。
 * 同一组 initialFilters 只应用一次，避免重复提交。
 */
export function useListInitialFilters(
  formRef: React.RefObject<ProFormInstance | undefined>,
  initialFilters?: Record<string, string>,
) {
  const appliedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!initialFilters || Object.keys(initialFilters).length === 0) {
      return;
    }

    const key = JSON.stringify(initialFilters);
    if (appliedKeyRef.current === key) {
      return;
    }
    appliedKeyRef.current = key;

    formRef.current?.setFieldsValue(initialFilters);
    formRef.current?.submit();
  }, [formRef, initialFilters]);
}
