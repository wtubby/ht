import { getCloseConfirmContent } from '@/utils/formConfirm';
import { Modal } from 'antd';
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';

interface UseDrawerFormLifecycleOptions {
  visible: boolean;
  onCancel: () => void;
  /** 抽屉关闭后（visible 变 false）重置业务状态（不含 dirty 标记，由 hook 统一处理） */
  onReset: () => void;
  /** 列表传入的当前记录 id（通常 currentRecord?.id） */
  recordId?: number;
  /** 抽屉仍打开时切换编辑记录（非首次打开） */
  onRecordSwitch?: () => void;
  /** 抽屉从关到开时触发（在 resetDirtyFlags 之后） */
  onOpenEdge?: () => void;
  /** 抽屉从开到关时触发（在 onReset 之后） */
  onCloseEdge?: () => void;
  /** 与合同搜索/详情回填等逻辑共享；传入后可先定义 onOpenEdge 再调用本 hook */
  hydratingRef?: MutableRefObject<boolean>;
  /** 与异步请求守卫共享；传入后由本 hook 同步 visible */
  visibleRef?: MutableRefObject<boolean>;
}

/**
 * Drawer 表单通用生命周期：脏标记、关闭确认、提交成功关闭。
 * 各业务 Form 的 onReset 只负责 recordId、详情等业务状态重置。
 * useEffect(visible) 统一处理打开/关闭边沿：打开时 resetDirtyFlags + onOpenEdge；
 * 关闭时 onReset + onCloseEdge。业务初始化请传入 onOpenEdge，勿在各 Form 重复维护 prevVisibleRef。
 *
 * 关闭顺序：attemptClose 先 onCancel（关抽屉）→ visible=false 后再 onReset（避免关闭动画前表单被清空）。
 * 提交成功：notifySubmitSuccess(onSuccess) → visible=false → onReset；onOpenChange → attemptClose（跳过确认、不调 onCancel）。
 * recordId：抽屉打开期间 id 变化时调用 onRecordSwitch（首次打开不触发）。
 */
export function useDrawerFormLifecycle({
  visible,
  onCancel,
  onReset,
  recordId,
  onRecordSwitch,
  onOpenEdge,
  onCloseEdge,
  hydratingRef: externalHydratingRef,
  visibleRef: externalVisibleRef,
}: UseDrawerFormLifecycleOptions) {
  const [formDirty, setFormDirty] = useState(false);
  const [filesDirty, setFilesDirty] = useState(false);
  const internalHydratingRef = useRef(false);
  const hydratingRef = externalHydratingRef ?? internalHydratingRef;
  const closedBySuccessRef = useRef(false);
  const isMountedRef = useRef(true);
  const internalVisibleRef = useRef(visible);
  const visibleRef = externalVisibleRef ?? internalVisibleRef;
  visibleRef.current = visible;
  const prevVisibleRef = useRef(false);
  const onOpenEdgeRef = useRef(onOpenEdge);
  onOpenEdgeRef.current = onOpenEdge;
  const onCloseEdgeRef = useRef(onCloseEdge);
  onCloseEdgeRef.current = onCloseEdge;
  const onResetRef = useRef(onReset);
  onResetRef.current = onReset;
  const prevRecordIdRef = useRef<number | undefined>();
  const onRecordSwitchRef = useRef(onRecordSwitch);
  onRecordSwitchRef.current = onRecordSwitch;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const resetDirtyFlags = useCallback(() => {
    setFormDirty(false);
    setFilesDirty(false);
  }, []);

  useEffect(() => {
    if (visible && !prevVisibleRef.current) {
      resetDirtyFlags();
      onOpenEdgeRef.current?.();
    } else if (!visible && prevVisibleRef.current) {
      onResetRef.current();
      onCloseEdgeRef.current?.();
    }
    prevVisibleRef.current = visible;
  }, [visible, resetDirtyFlags]);

  useEffect(() => {
    if (!visible) {
      prevRecordIdRef.current = undefined;
      return;
    }
    if (prevRecordIdRef.current !== undefined && prevRecordIdRef.current !== recordId) {
      onRecordSwitchRef.current?.();
    }
    prevRecordIdRef.current = recordId;
  }, [visible, recordId]);

  const markFormClean = useCallback(() => {
    setFormDirty(false);
  }, []);

  const markFormDirtyIfNotHydrating = useCallback(() => {
    if (!hydratingRef.current) {
      setFormDirty(true);
    }
  }, [hydratingRef]);

  const markFilesDirty = useCallback(() => {
    setFilesDirty(true);
  }, []);

  const attemptClose = useCallback(() => {
    const finishClose = () => {
      resetDirtyFlags();
      if (!closedBySuccessRef.current) {
        onCancel();
      }
      closedBySuccessRef.current = false;
    };

    if (closedBySuccessRef.current) {
      finishClose();
      return;
    }

    if (formDirty || filesDirty) {
      Modal.confirm({
        title: '确认关闭',
        content: getCloseConfirmContent(formDirty, filesDirty),
        onOk: finishClose,
      });
      return;
    }
    finishClose();
  }, [formDirty, filesDirty, onCancel, resetDirtyFlags]);

  /** 提交成功关闭：仅标记，业务状态留待 visible=false 时由 onReset 清理 */
  const markSuccessClose = useCallback(() => {
    resetDirtyFlags();
    closedBySuccessRef.current = true;
  }, [resetDirtyFlags]);

  const notifySubmitSuccess = useCallback(
    (onSuccess: () => void) => {
      markSuccessClose();
      onSuccess();
    },
    [markSuccessClose],
  );

  /** 组件仍挂载时执行副作用，用于 async finally 中的 setState */
  const runIfMounted = useCallback((fn: () => void) => {
    if (isMountedRef.current) {
      fn();
    }
  }, []);

  /** 组件挂载且抽屉仍打开 */
  const isActive = useCallback(() => isMountedRef.current && visibleRef.current, []);

  /** 组件挂载且抽屉仍打开时执行副作用 */
  const runIfActive = useCallback((fn: () => void) => {
    if (isActive()) {
      fn();
    }
  }, [isActive]);

  return {
    hydratingRef,
    visibleRef,
    isActive,
    runIfMounted,
    runIfActive,
    markFormClean,
    markFormDirtyIfNotHydrating,
    markFilesDirty,
    attemptClose,
    notifySubmitSuccess,
  };
}
