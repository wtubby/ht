import { COLORS } from '@/constants/colors';
import { isInvoiceDuplicateError } from '@/utils/apiError';
import { convertChineseDateToStandard } from '@/utils/format';
import type { ProFormInstance } from '@ant-design/pro-components';
import type { MessageInstance } from 'antd/es/message/interface';
import dayjs from 'dayjs';
import type { CSSProperties, MutableRefObject, RefObject } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { Rule } from 'antd/es/form';

export const INVOICE_FIELD_RULES = {
  invoice_no: [
    { required: true, message: '请输入发票号码' },
    { whitespace: true, message: '发票号码不能为空' },
    { max: 50, message: '发票号码不能超过50个字符' },
  ] as Rule[],
  invoice_date: [{ required: true, message: '请选择开票日期' }] as Rule[],
  contract: [{ required: true, message: '请选择关联合同' }] as Rule[],
  buyer: [
    { required: true, message: '请输入购买方名称' },
    { whitespace: true, message: '购买方名称不能为空' },
    { max: 200, message: '购买方名称不能超过200个字符' },
  ] as Rule[],
  seller: [
    { required: true, message: '请输入销售方名称' },
    { whitespace: true, message: '销售方名称不能为空' },
    { max: 200, message: '销售方名称不能超过200个字符' },
  ] as Rule[],
  invoice_amount: [
    { required: true, message: '请输入发票金额' },
    {
      pattern: /^-?\d+(\.\d{1,2})?$/,
      message: '请输入有效的金额（最多两位小数）',
    },
  ] as Rule[],
};

export const INITIAL_CONTRACT_LIMIT = 10;
export const SEARCH_CONTRACT_LIMIT = 20;

export const SECTION_TITLE_STYLE: CSSProperties = {
  marginBottom: 8,
  color: COLORS.textSecondary,
  fontWeight: 600,
  fontSize: 16,
};

export interface OcrResultData {
  invoice_no?: string;
  invoice_date?: string;
  buyer?: string;
  seller?: string;
  invoice_amount?: number;
  tax_rate?: number;
  remarks?: string;
}

export interface InvoiceBasePayload {
  invoice_no: string;
  invoice_date: string;
  invoice_amount: number;
  buyer: string;
  seller: string;
  tax_rate?: number;
  remarks?: string;
}

/** 发票号重复时回填字段错误，供 useDrawerSaveSubmit.onSubmitError 使用 */
export const mapInvoiceSubmitError = (
  formRef: RefObject<ProFormInstance | undefined>,
  error: unknown,
): string | undefined => {
  if (!isInvoiceDuplicateError(error)) return undefined;
  const msg = '该发票号码已存在，请更换后重试';
  formRef.current?.setFields([{ name: 'invoice_no', errors: [msg] }]);
  return msg;
};

export const generateTempInvoiceNo = () =>
  `TEMP_${dayjs().format('YYYYMMDD')}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

export const parseValidatedAmount = (value: unknown): number => {
  const amount = parseFloat(String(value));
  if (!Number.isFinite(amount)) {
    throw new Error('发票金额无效');
  }
  return amount;
};

export const isInvoiceRequiredFilled = (
  values: Record<string, unknown>,
  contractField: 'sub_contract_id' | 'main_contract_id',
) =>
  !!(
    values.invoice_no &&
    values.invoice_date &&
    values[contractField] &&
    values.buyer &&
    values.seller &&
    values.invoice_amount != null &&
    values.invoice_amount !== ''
  );

export const mergeContractOptions = <T extends { value: number }>(
  prev: T[],
  incoming: T[],
  keepValues: number[],
): T[] => {
  const incomingMap = new Map(incoming.map((o) => [o.value, o]));
  const kept = prev.filter((o) => keepValues.includes(o.value) && !incomingMap.has(o.value));
  return [...kept, ...incoming];
};

export const buildInvoiceCommonPayload = (values: Record<string, any>): InvoiceBasePayload => ({
  invoice_no: values.invoice_no,
  invoice_date: values.invoice_date.format('YYYY-MM-DD'),
  invoice_amount: parseValidatedAmount(values.invoice_amount),
  buyer: values.buyer,
  seller: values.seller,
  tax_rate: values.tax_rate != null ? Number(values.tax_rate) : undefined,
  remarks: values.remarks,
});

export const initNewInvoiceFormFields = (
  formRef: RefObject<ProFormInstance | undefined>,
  hydratingRef: MutableRefObject<boolean>,
) => {
  hydratingRef.current = true;
  try {
    formRef.current?.setFieldsValue({
      invoice_no: generateTempInvoiceNo(),
      invoice_date: dayjs(),
    });
  } finally {
    hydratingRef.current = false;
  }
};

export const applyInvoiceDetailToForm = <T extends API.InvoiceIn | API.InvoiceOut>(
  formRef: RefObject<ProFormInstance | undefined>,
  hydratingRef: MutableRefObject<boolean>,
  data: T,
) => {
  hydratingRef.current = true;
  try {
    formRef.current?.setFieldsValue({
      ...data,
      invoice_date: data.invoice_date ? dayjs(data.invoice_date) : null,
      tax_rate: data.tax_rate != null ? Number(data.tax_rate) : undefined,
    });
  } finally {
    hydratingRef.current = false;
  }
};

export const fillFormFromOcrData = (
  formRef: RefObject<ProFormInstance | undefined>,
  data: OcrResultData,
) => {
  const standardDate = convertChineseDateToStandard(data.invoice_date ?? '');
  const fieldsToSet: Record<string, unknown> = {
    invoice_no: data.invoice_no ?? '',
    invoice_date: standardDate ? dayjs(standardDate) : null,
    buyer: data.buyer,
    seller: data.seller,
    invoice_amount: data.invoice_amount,
  };

  if (data.tax_rate != null) {
    fieldsToSet.tax_rate = Number(data.tax_rate);
  }
  if (data.remarks?.trim()) {
    fieldsToSet.remarks = data.remarks;
  }

  formRef.current?.setFieldsValue(fieldsToSet);
};

export const getInvoiceRenameFields = (formRef: RefObject<ProFormInstance | undefined>) => {
  const values = formRef.current?.getFieldsValue(true);
  if (!values) return undefined;
  const date = values.invoice_date;
  return {
    invoice_no: values.invoice_no,
    seller: values.seller,
    invoice_date: dayjs.isDayjs(date)
      ? date.format('YYYY-MM-DD')
      : date != null
        ? String(date)
        : undefined,
    invoice_amount: values.invoice_amount,
  };
};

interface SelectOptionsResponse {
  success?: boolean;
}

export interface UseInvoiceContractSelectOptions<TOption extends { label: string; value: number }> {
  visible: boolean;
  currentRecordId?: number;
  effectiveId: number | null | undefined;
  selectedIdRef: MutableRefObject<number | null>;
  visibleRef: MutableRefObject<boolean>;
  message: MessageInstance;
  preloadContracts?: unknown[];
  fetchOptions: (params: { search?: string; limit: number }) => Promise<SelectOptionsResponse>;
  extractContracts: (response: SelectOptionsResponse) => unknown[];
  mapToOptions: (contracts: unknown[]) => TOption[];
  formRef?: RefObject<ProFormInstance | undefined>;
  hydratingRef?: MutableRefObject<boolean>;
}

/** 合同下拉：搜索 debounce、merge 选项、新建时打开边沿初始化 */
export function useInvoiceContractSelect<TOption extends { label: string; value: number }>({
  visible,
  currentRecordId,
  effectiveId,
  selectedIdRef,
  visibleRef,
  message,
  preloadContracts,
  fetchOptions,
  extractContracts,
  mapToOptions,
  formRef,
  hydratingRef,
}: UseInvoiceContractSelectOptions<TOption>) {
  const [contractLoading, setContractLoading] = useState(false);
  const [contractOptions, setContractOptions] = useState<TOption[]>([]);

  const resetContractOptions = useCallback(() => {
    setContractOptions([]);
  }, []);

  const withContractLoading = useCallback(
    async (fn: () => Promise<void>) => {
      try {
        setContractLoading(true);
        await fn();
      } finally {
        if (visibleRef.current) {
          setContractLoading(false);
        }
      }
    },
    [visibleRef],
  );

  const mergeIncoming = useCallback(
    (incoming: TOption[]) => {
      const keepValues = selectedIdRef.current ? [selectedIdRef.current] : [];
      setContractOptions((prev) => mergeContractOptions(prev, incoming, keepValues));
    },
    [selectedIdRef],
  );

  const searchByField = useCallback(
    async (value: string) => {
      await withContractLoading(async () => {
        const response = await fetchOptions({
          search: value.trim(),
          limit: SEARCH_CONTRACT_LIMIT,
        });
        if (!visibleRef.current) return;
        const raw = response.success ? extractContracts(response) : [];

        if (raw.length > 0) {
          mergeIncoming(mapToOptions(raw));
        } else {
          setContractOptions((prev) =>
            selectedIdRef.current
              ? prev.filter((o) => o.value === selectedIdRef.current)
              : [],
          );
          message.warning('未找到匹配的合同');
        }
      });
    },
    [
      fetchOptions,
      extractContracts,
      mapToOptions,
      mergeIncoming,
      message,
      visibleRef,
      withContractLoading,
      selectedIdRef,
    ],
  );

  const loadBasicContracts = useCallback(async () => {
    await withContractLoading(async () => {
      const response = await fetchOptions({ limit: INITIAL_CONTRACT_LIMIT });
      if (!visibleRef.current) return;
      const raw = response.success ? extractContracts(response) : [];
      if (raw.length > 0) {
        mergeIncoming(mapToOptions(raw));
      }
    });
  }, [fetchOptions, extractContracts, mapToOptions, mergeIncoming, visibleRef, withContractLoading]);

  const searchByFieldRef = useRef(searchByField);
  searchByFieldRef.current = searchByField;
  const loadBasicContractsRef = useRef(loadBasicContracts);
  loadBasicContractsRef.current = loadBasicContracts;
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const cancelContractSearch = useCallback(() => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
      searchTimerRef.current = undefined;
    }
  }, []);

  useEffect(() => () => cancelContractSearch(), [cancelContractSearch]);

  useEffect(() => {
    if (preloadContracts && preloadContracts.length > 0) {
      if (visible && !currentRecordId && !effectiveId) {
        mergeIncoming(mapToOptions(preloadContracts));
      }
    }
  }, [preloadContracts, visible, currentRecordId, effectiveId, mapToOptions, mergeIncoming]);

  const runOpenEdgeInit = useCallback(() => {
    if (!currentRecordId && formRef && hydratingRef) {
      initNewInvoiceFormFields(formRef, hydratingRef);
      void loadBasicContracts();
    }
  }, [currentRecordId, formRef, hydratingRef, loadBasicContracts]);

  const handleContractSearch = useCallback(
    (value: string) => {
      cancelContractSearch();
      if (value.length > 0) {
        searchTimerRef.current = setTimeout(() => {
          searchTimerRef.current = undefined;
          void searchByFieldRef.current(value);
        }, 500);
      } else {
        void loadBasicContracts();
      }
    },
    [cancelContractSearch, loadBasicContracts],
  );

  return {
    contractLoading,
    contractOptions,
    setContractOptions,
    resetContractOptions,
    withContractLoading,
    loadBasicContracts,
    runOpenEdgeInit,
    handleContractSearch,
    cancelContractSearch,
  };
}
