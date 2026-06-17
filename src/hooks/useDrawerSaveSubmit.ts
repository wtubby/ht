import { getErrorMessage } from '@/utils/apiError';
import type { MessageInstance } from 'antd/es/message/interface';
import {
  useCallback,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type RefObject,
  type SetStateAction,
} from 'react';

export interface DrawerSaveSubmitMessages {
  createLoading: string;
  updateLoading: string;
  continueSuccess: string;
  updateSuccess: string;
  /** 新建后关闭抽屉时的成功提示 */
  closeCreateSuccess?: string;
  /** 编辑后关闭抽屉时的成功提示（默认同 updateSuccess） */
  closeUpdateSuccess?: string;
}

export interface DrawerCreateSuccessContext {
  savedId: number;
  result: unknown;
  values: Record<string, unknown>;
}

export type BeforeSubmitResult = void | { ok: false; message: string };

export interface DrawerSubmitErrorContext {
  error: unknown;
  isEditMode: boolean;
}

interface FormRefLike {
  validateFields: () => Promise<Record<string, unknown>>;
  setFields?: (fields: { name: string; errors: string[] }[]) => void;
}

export interface UseDrawerSaveSubmitOptions<TPayload> {
  formRef: RefObject<FormRefLike | null | undefined>;
  effectiveId: number | null;
  /** 异步提交过程中读取最新 id（如发票新建后保存并继续） */
  effectiveIdRef?: MutableRefObject<number | null>;
  setEffectiveId?: Dispatch<SetStateAction<number | null>>;
  isActive: () => boolean;
  runIfMounted: (fn: () => void) => void;
  buildPayload: (values: Record<string, unknown>) => TPayload;
  add: (payload: TPayload) => Promise<unknown>;
  update: (id: number, payload: TPayload) => Promise<unknown>;
  getSavedId: (result: unknown) => number | undefined;
  onCreateSuccess?: (ctx: DrawerCreateSuccessContext) => void;
  notifySubmitSuccess: (onSuccess: () => void) => void;
  onSuccess: () => void;
  message: MessageInstance;
  messages: DrawerSaveSubmitMessages;
  getUpdateSuccessMessage?: () => string;
  /** 新建成功后是否关闭抽屉，默认 false（保存并继续） */
  closeAfterCreate?: boolean;
  /** 编辑成功后是否关闭抽屉，默认 true */
  closeAfterUpdate?: boolean;
  /** 保存并继续时标记表单为干净 */
  markFormClean?: () => void;
  /** 提交前校验，返回 { ok: false, message } 则中断 */
  beforeSubmit?: (ctx: {
    values: Record<string, unknown>;
    isEditMode: boolean;
  }) => BeforeSubmitResult | Promise<BeforeSubmitResult>;
  /** 自定义错误处理，返回文案则用于 message.error */
  onSubmitError?: (ctx: DrawerSubmitErrorContext) => string | undefined;
}

/**
 * 抽屉表单通用提交流程：保存并继续 / 编辑提交关闭。
 * 支持防连点、effectiveIdRef、提交前校验、字段级错误扩展。
 */
export function useDrawerSaveSubmit<TPayload>({
  formRef,
  effectiveId,
  effectiveIdRef,
  setEffectiveId,
  isActive,
  runIfMounted,
  buildPayload,
  add,
  update,
  getSavedId,
  onCreateSuccess,
  notifySubmitSuccess,
  onSuccess,
  message,
  messages,
  getUpdateSuccessMessage,
  closeAfterCreate = false,
  closeAfterUpdate = true,
  markFormClean,
  beforeSubmit,
  onSubmitError,
}: UseDrawerSaveSubmitOptions<TPayload>) {
  const isSubmittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resolveErrorMessage = useCallback(
    (error: unknown, isEditMode: boolean) => {
      const custom = onSubmitError?.({ error, isEditMode });
      if (custom) return custom;
      return getErrorMessage(error, isEditMode ? '更新失败，请重试' : '保存失败，请重试');
    },
    [onSubmitError],
  );

  const handleSubmit = useCallback(
    async (closeAfter?: boolean) => {
      if (isSubmittingRef.current) return;
      isSubmittingRef.current = true;
      setIsSubmitting(true);

      let shouldClose = false;
      try {
        let values: Record<string, unknown>;
        try {
          values = (await formRef.current?.validateFields()) as Record<string, unknown>;
        } catch (error) {
          if (error && typeof error === 'object' && 'errorFields' in error) return;
          throw error;
        }
        if (!values || !isActive()) return;

        const currentId = effectiveIdRef?.current ?? effectiveId;
        const isEditMode = (currentId ?? 0) > 0;

        const beforeResult = await beforeSubmit?.({ values, isEditMode });
        if (beforeResult && 'ok' in beforeResult && beforeResult.ok === false) {
          message.error(beforeResult.message);
          return;
        }

        const payload = buildPayload(values);

        if (!isEditMode) {
          const hide = message.loading(messages.createLoading);
          try {
            const result = await add(payload);
            hide();
            if (!isActive()) return;

            const savedId = getSavedId(result);
            if (!savedId) {
              message.error('保存失败，未返回记录编号');
              return;
            }

            if (effectiveIdRef) {
              effectiveIdRef.current = savedId;
            }
            setEffectiveId?.(savedId);
            runIfMounted(() => {
              onCreateSuccess?.({ savedId, result, values });
            });

            const shouldCloseAfterCreate = closeAfter ?? closeAfterCreate;
            if (shouldCloseAfterCreate) {
              message.success(messages.closeCreateSuccess ?? messages.continueSuccess);
              shouldClose = true;
            } else {
              markFormClean?.();
              message.success(messages.continueSuccess);
            }
          } catch (error) {
            hide();
            if (!isActive()) return;
            if (error && typeof error === 'object' && 'errorFields' in error) return;
            message.error(resolveErrorMessage(error, false));
          }
        } else {
          const hide = message.loading(messages.updateLoading);
          try {
            await update(currentId!, payload);
            hide();
            if (!isActive()) return;

            const shouldCloseAfterUpdate = closeAfter ?? closeAfterUpdate;
            if (shouldCloseAfterUpdate) {
              message.success(
                getUpdateSuccessMessage?.() ??
                  messages.closeUpdateSuccess ??
                  messages.updateSuccess,
              );
              shouldClose = true;
            } else {
              markFormClean?.();
              message.success(messages.updateSuccess);
            }
          } catch (error) {
            hide();
            if (!isActive()) return;
            if (error && typeof error === 'object' && 'errorFields' in error) return;
            message.error(resolveErrorMessage(error, true));
          }
        }
      } finally {
        isSubmittingRef.current = false;
        runIfMounted(() => setIsSubmitting(false));
      }

      if (shouldClose && isActive()) {
        notifySubmitSuccess(onSuccess);
      }
    },
    [
      formRef,
      effectiveId,
      effectiveIdRef,
      setEffectiveId,
      isActive,
      runIfMounted,
      buildPayload,
      add,
      update,
      getSavedId,
      onCreateSuccess,
      notifySubmitSuccess,
      onSuccess,
      message,
      messages,
      getUpdateSuccessMessage,
      closeAfterCreate,
      closeAfterUpdate,
      markFormClean,
      beforeSubmit,
      resolveErrorMessage,
    ],
  );

  return { isSubmitting, handleSubmit };
}
