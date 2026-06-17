import type { BusinessFileUploaderRef } from '@/components/BusinessFileUploader';
import { resolveInvoiceBuyerSeller } from '@/hooks';
import { getApiEntity } from '@/utils/apiResponse';
import type { ProFormInstance } from '@ant-design/pro-components';
import type { QueryClient } from '@tanstack/react-query';
import type { HookAPI } from 'antd/es/modal/useModal';
import type { MessageInstance } from 'antd/es/message/interface';
import {
  useCallback,
  type Dispatch,
  type MutableRefObject,
  type RefObject,
  type SetStateAction,
} from 'react';

type InvoiceContractFieldName = 'sub_contract_id' | 'main_contract_id';
type InvoiceDirection = 'in' | 'out';

interface ContractQueryDef {
  queryKey: readonly unknown[];
  queryFn: () => Promise<unknown>;
}

type InvoicePartyCarrier = {
  partyA?: API.Company;
  partyB?: API.Company;
  partyC?: API.Company;
};

interface UseInvoiceFormContractLinkOptions<
  TOption extends { value: number } & InvoicePartyCarrier,
  TEntity extends InvoicePartyCarrier,
> {
  direction: InvoiceDirection;
  contractFieldName: InvoiceContractFieldName;
  formRef: RefObject<ProFormInstance | undefined>;
  hydratingRef: MutableRefObject<boolean>;
  visibleRef: MutableRefObject<boolean>;
  fileUploaderRef: RefObject<BusinessFileUploaderRef | null>;
  modal: HookAPI;
  message: MessageInstance;
  queryClient: QueryClient;
  selectedContractIdRef: MutableRefObject<number | null>;
  setContractOptions: Dispatch<SetStateAction<TOption[]>>;
  withContractLoading: (fn: () => Promise<void>) => Promise<void>;
  getContractQuery: (id: number) => ContractQueryDef;
  toOption: (entity: TEntity) => TOption;
  onContractFetched: (entity: TEntity, option: TOption) => void;
  onContractApplied: (value: number, option: TOption) => void;
  onContractCleared: () => void;
  beforeApplyContract?: (value: number, option: TOption) => void;
}

/** 发票表单合同联动：详情回填拉取、切换购销方、切换合同时附件确认 */
export function useInvoiceFormContractLink<
  TOption extends { value: number } & InvoicePartyCarrier,
  TEntity extends InvoicePartyCarrier,
>({
  direction,
  contractFieldName,
  formRef,
  hydratingRef,
  visibleRef,
  fileUploaderRef,
  modal,
  message,
  queryClient,
  selectedContractIdRef,
  setContractOptions,
  withContractLoading,
  getContractQuery,
  toOption,
  onContractFetched,
  onContractApplied,
  onContractCleared,
  beforeApplyContract,
}: UseInvoiceFormContractLinkOptions<TOption, TEntity>) {
  const fetchContractById = useCallback(
    async (contractId: number) => {
      if (!contractId) return;

      try {
        await withContractLoading(async () => {
          const response = await queryClient.fetchQuery(getContractQuery(contractId));
          if (!visibleRef.current) return;

          const contract = getApiEntity<TEntity & { id?: number }>(response);
          if (!contract?.id) return;

          const option = toOption(contract as TEntity);
          setContractOptions((prev) => {
            const exists = prev.some((o) => o.value === option.value);
            return exists ? prev : [option, ...prev];
          });
          onContractFetched(contract, option);

          hydratingRef.current = true;
          try {
            formRef.current?.setFieldsValue(resolveInvoiceBuyerSeller(contract, direction));
          } finally {
            hydratingRef.current = false;
          }
        });
      } catch {
        message.warning('获取合同信息失败');
      }
    },
    [
      direction,
      formRef,
      hydratingRef,
      message,
      onContractFetched,
      queryClient,
      setContractOptions,
      toOption,
      visibleRef,
      withContractLoading,
      getContractQuery,
    ],
  );

  const applyContractChange = useCallback(
    (value: number, option: TOption) => {
      beforeApplyContract?.(value, option);
      onContractApplied(value, option);
      formRef.current?.setFieldsValue(resolveInvoiceBuyerSeller(option, direction));
    },
    [beforeApplyContract, direction, formRef, onContractApplied],
  );

  const handleContractChange = useCallback(
    (value: number | null | undefined, option?: TOption | TOption[]) => {
      if (value == null) {
        onContractCleared();
        formRef.current?.setFieldsValue({ buyer: '', seller: '' });
        return;
      }

      if (Array.isArray(option)) return;
      if (!option) return;

      const previousId = selectedContractIdRef.current;
      const existingCount = fileUploaderRef.current?.getFileCount() || 0;
      if (existingCount > 0 && previousId && previousId !== value) {
        modal.confirm({
          title: '切换合同',
          content: `当前已有 ${existingCount} 个已上传文件，切换合同将永久删除这些文件，确定继续吗？`,
          onOk: async () => {
            try {
              await fileUploaderRef.current?.clearAllFiles();
              applyContractChange(value, option);
            } catch {
              message.error('文件清理失败，无法切换合同');
            }
          },
          onCancel: () => {
            formRef.current?.setFieldsValue({ [contractFieldName]: previousId });
          },
        });
        return;
      }

      applyContractChange(value, option);
    },
    [
      applyContractChange,
      contractFieldName,
      fileUploaderRef,
      formRef,
      message,
      modal,
      onContractCleared,
      selectedContractIdRef,
    ],
  );

  return {
    fetchContractById,
    handleContractChange,
  };
}
