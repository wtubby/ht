import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

type QueryDef<TResponse> = {
  queryKey: readonly unknown[];
  queryFn: () => Promise<TResponse>;
};

interface UseDrawerDetailQueryOptions<TResponse, TData> {
  visible: boolean;
  /** 抽屉打开且需拉详情时的 id；关闭时应为 undefined */
  detailId: number | undefined;
  getQuery: (id: number) => QueryDef<TResponse>;
  select: (response: TResponse) => TData | null | undefined;
  onDetail: (data: TData) => void;
  onError?: (error: unknown) => void;
}

const DISABLED_DETAIL_KEY = ['drawerDetail', 'disabled'] as const;

/**
 * 抽屉表单详情查询：visible=false 时 enabled 为 false，避免关抽屉后 in-flight 请求写回表单。
 * 每个 detailId 仅自动 onDetail 一次；mutation 写缓存不会重复回填。refetchDetail 会清除去重并重新拉取。
 */
export function useDrawerDetailQuery<TResponse, TData>({
  visible,
  detailId,
  getQuery,
  select,
  onDetail,
  onError,
}: UseDrawerDetailQueryOptions<TResponse, TData>) {
  const lastAppliedDetailIdRef = useRef<number | null>(null);
  const prevDetailIdRef = useRef<number | undefined>(undefined);
  const reportedErrorRef = useRef(false);
  const [detailUnavailable, setDetailUnavailable] = useState(false);

  const queryDef = detailId != null ? getQuery(detailId) : null;

  const { data: response, isFetching, isError, refetch, error } = useQuery({
    queryKey: queryDef?.queryKey ?? DISABLED_DETAIL_KEY,
    queryFn: queryDef?.queryFn ?? (async () => null as TResponse),
    enabled: visible && detailId != null,
  });

  useEffect(() => {
    if (!visible) {
      lastAppliedDetailIdRef.current = null;
      prevDetailIdRef.current = undefined;
      reportedErrorRef.current = false;
      setDetailUnavailable(false);
      return;
    }
    if (detailId == null) return;

    if (prevDetailIdRef.current !== detailId) {
      lastAppliedDetailIdRef.current = null;
      prevDetailIdRef.current = detailId;
      reportedErrorRef.current = false;
      setDetailUnavailable(false);
    }

    if (isError) {
      if (!reportedErrorRef.current) {
        reportedErrorRef.current = true;
        setDetailUnavailable(true);
        onError?.(error);
      }
      return;
    }

    if (response === undefined) return;

    if (lastAppliedDetailIdRef.current === detailId) return;

    const data = select(response);
    if (data == null) {
      if (!reportedErrorRef.current) {
        reportedErrorRef.current = true;
        setDetailUnavailable(true);
        onError?.(response);
      }
      lastAppliedDetailIdRef.current = detailId;
      return;
    }

    reportedErrorRef.current = false;
    setDetailUnavailable(false);
    onDetail(data);
    lastAppliedDetailIdRef.current = detailId;
  }, [visible, detailId, response, isError, error, select, onDetail, onError]);

  const refetchDetail = useCallback(async () => {
    lastAppliedDetailIdRef.current = null;
    return refetch();
  }, [refetch]);

  return {
    isLoading: visible && detailId != null && isFetching,
    isError: visible && detailId != null && (isError || detailUnavailable),
    refetchDetail,
  };
}
