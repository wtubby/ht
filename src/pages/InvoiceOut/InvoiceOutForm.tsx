import type { BusinessFileUploaderRef } from '@/components/BusinessFileUploader';
import {
  fetchInvoiceOutQuery,
  fetchMainContractQuery,
  useAddInvoiceOut,
  useDrawerDetailQuery,
  useDrawerFormLifecycle,
  useDrawerSaveSubmit,
  useInvoiceOutSelectOptions,
  useUpdateInvoiceOut,
} from '@/hooks';
import InvoiceFormAttachmentPanel from '@/pages/Invoice/InvoiceFormAttachmentPanel';
import InvoiceFormFields from '@/pages/Invoice/InvoiceFormFields';
import {
  applyInvoiceDetailToForm,
  buildInvoiceCommonPayload,
  INITIAL_CONTRACT_LIMIT,
  isInvoiceRequiredFilled,
  mapInvoiceSubmitError,
  useInvoiceContractSelect,
} from '@/pages/Invoice/invoiceForm.shared';
import { useInvoiceFormContractLink } from '@/pages/Invoice/useInvoiceFormContractLink';
import { getInvoiceOutSelectOptions } from '@/services/wtu/invoiceOut.api';
import { getSavedEntityId, selectApiDetail } from '@/utils/apiResponse';
import type { ProFormInstance } from '@ant-design/pro-components';
import { DrawerForm } from '@ant-design/pro-components';
import { useQueryClient } from '@tanstack/react-query';
import { App, Button, Col, Row, Spin } from 'antd';
import React, { useCallback, useRef, useState } from 'react';

interface InvoiceOutFormProps {
  visible: boolean;
  currentRecord?: API.InvoiceOut;
  onSuccess: () => void;
  onCancel: () => void;
}

interface ContractOption {
  label: string;
  value: number;
  partyA?: API.Company;
  partyB?: API.Company;
}

interface InvoiceOutPayload extends ReturnType<typeof buildInvoiceCommonPayload> {
  main_contract_id: number;
}

const toMainContractOption = (contract: API.MainContract): ContractOption => ({
  label: contract.contract_name || '未命名',
  value: contract.id!,
  partyA: contract.partyA,
  partyB: contract.partyB,
});

const mapMainContractsToOptions = (contracts: unknown[]): ContractOption[] =>
  (contracts as API.MainContract[])
    .filter((c): c is API.MainContract & { id: number } => c.id != null)
    .map(toMainContractOption);

const extractMainContracts = (response: { success?: boolean; data?: { mainContracts?: unknown[] } }) =>
  response.data?.mainContracts ?? [];

const selectInvoiceOutDetail = (response: unknown) => selectApiDetail<API.InvoiceOut>(response);

const InvoiceOutForm: React.FC<InvoiceOutFormProps> = ({
  visible,
  currentRecord,
  onSuccess,
  onCancel,
}) => {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const addMutation = useAddInvoiceOut();
  const updateMutation = useUpdateInvoiceOut();
  const { data: selectOptionsResponse } = useInvoiceOutSelectOptions({
    limit: INITIAL_CONTRACT_LIMIT,
  });

  const formRef = useRef<ProFormInstance>();
  const fileUploaderRef = useRef<BusinessFileUploaderRef>(null);
  const selectedMainContractIdRef = useRef<number | null>(null);
  const effectiveIdRef = useRef<number | null>(null);
  const hydratingRef = useRef(false);
  const visibleRef = useRef(visible);
  visibleRef.current = visible;

  const [newlyCreatedId, setNewlyCreatedId] = useState<number | null>(null);
  const [canSaveInvoice, setCanSaveInvoice] = useState(false);
  const [selectedMainContractId, setSelectedMainContractId] = useState<number | null>(null);

  const effectiveId = currentRecord?.id ?? newlyCreatedId ?? null;
  const isEditMode = (effectiveId ?? 0) > 0;
  effectiveIdRef.current = effectiveId;

  const clearSelectedContract = useCallback(() => {
    setSelectedMainContractId(null);
    selectedMainContractIdRef.current = null;
  }, []);

  const mapToOptions = useCallback((contracts: unknown[]) => mapMainContractsToOptions(contracts), []);

  const {
    contractLoading,
    contractOptions,
    setContractOptions,
    resetContractOptions,
    withContractLoading,
    handleContractSearch,
    cancelContractSearch,
    runOpenEdgeInit,
  } = useInvoiceContractSelect({
    visible,
    currentRecordId: currentRecord?.id,
    effectiveId,
    selectedIdRef: selectedMainContractIdRef,
    visibleRef,
    message,
    preloadContracts: selectOptionsResponse?.success
      ? selectOptionsResponse.data?.mainContracts
      : undefined,
    fetchOptions: getInvoiceOutSelectOptions,
    extractContracts: extractMainContracts,
    mapToOptions,
    formRef,
    hydratingRef,
  });

  const clearInvoiceFormState = useCallback(() => {
    setNewlyCreatedId(null);
    clearSelectedContract();
    setCanSaveInvoice(false);
    formRef.current?.resetFields();
  }, [clearSelectedContract]);

  const resetBusinessState = useCallback(() => {
    clearInvoiceFormState();
    resetContractOptions();
  }, [clearInvoiceFormState, resetContractOptions]);

  const handleOpenEdge = useCallback(() => {
    clearInvoiceFormState();
    if (!currentRecord?.id) {
      runOpenEdgeInit();
    }
  }, [clearInvoiceFormState, currentRecord?.id, runOpenEdgeInit]);

  const {
    isActive,
    runIfMounted,
    markFormClean,
    markFormDirtyIfNotHydrating,
    markFilesDirty,
    attemptClose,
    notifySubmitSuccess,
  } = useDrawerFormLifecycle({
    visible,
    onCancel,
    onReset: resetBusinessState,
    onOpenEdge: handleOpenEdge,
    recordId: currentRecord?.id,
    onRecordSwitch: clearInvoiceFormState,
    hydratingRef,
    visibleRef,
  });

  const { fetchContractById, handleContractChange } = useInvoiceFormContractLink<
    ContractOption,
    API.MainContract
  >({
    direction: 'out',
    contractFieldName: 'main_contract_id',
    formRef,
    hydratingRef,
    visibleRef,
    fileUploaderRef,
    modal,
    message,
    queryClient,
    selectedContractIdRef: selectedMainContractIdRef,
    setContractOptions,
    withContractLoading,
    getContractQuery: fetchMainContractQuery,
    toOption: toMainContractOption,
    onContractFetched: (contract) => {
      setSelectedMainContractId(contract.id!);
      selectedMainContractIdRef.current = contract.id!;
    },
    onContractApplied: (value) => {
      setSelectedMainContractId(value);
      selectedMainContractIdRef.current = value;
    },
    onContractCleared: clearSelectedContract,
    beforeApplyContract: (_value, option) => {
      cancelContractSearch();
      setContractOptions((prev) => {
        const exists = prev.some((o) => o.value === option.value);
        return exists ? prev : [option, ...prev];
      });
    },
  });

  const applyInvoiceOutDetail = useCallback(
    (data: API.InvoiceOut) => {
      applyInvoiceDetailToForm(formRef, hydratingRef, data);
      markFormClean();
      if (data.main_contract_id) {
        // 编辑态保留发票已保存的购销方，仅拉取合同用于下拉选项
        void fetchContractById(data.main_contract_id, { fillBuyerSeller: false });
      }
    },
    [hydratingRef, markFormClean, fetchContractById],
  );

  const detailId = visible ? (effectiveId ?? undefined) : undefined;

  const handleDetailError = useCallback(() => {
    message.error('获取销项发票详情失败');
  }, [message]);

  const { isLoading: loading } = useDrawerDetailQuery({
    visible,
    detailId,
    getQuery: fetchInvoiceOutQuery,
    select: selectInvoiceOutDetail,
    onDetail: applyInvoiceOutDetail,
    onError: handleDetailError,
  });

  const buildPayload = useCallback(
    (values: Record<string, unknown>): InvoiceOutPayload => ({
      ...buildInvoiceCommonPayload(values),
      main_contract_id: Number(values.main_contract_id),
    }),
    [],
  );

  const { isSubmitting, handleSubmit } = useDrawerSaveSubmit({
    formRef,
    effectiveId,
    effectiveIdRef,
    setEffectiveId: setNewlyCreatedId,
    isActive,
    runIfMounted,
    buildPayload,
    add: (data) => addMutation.mutateAsync({ ...data } as API.InvoiceOut),
    update: (id, data) => updateMutation.mutateAsync({ id, data: data as API.InvoiceOut }),
    getSavedId: getSavedEntityId,
    markFormClean,
    notifySubmitSuccess,
    onSuccess,
    message,
    messages: {
      createLoading: '正在保存销项发票',
      updateLoading: '正在更新销项发票',
      continueSuccess: '保存成功',
      updateSuccess: '更新成功',
      closeCreateSuccess: '提交成功',
      closeUpdateSuccess: '更新成功',
    },
    onSubmitError: ({ error }) => mapInvoiceSubmitError(formRef, error),
  });

  const handleValuesChange = (_: Partial<API.InvoiceOut>, allValues: Record<string, unknown>) => {
    markFormDirtyIfNotHydrating();
    setCanSaveInvoice(isInvoiceRequiredFilled(allValues, 'main_contract_id'));
  };

  return (
    <DrawerForm
      formRef={formRef}
      title={isEditMode ? '编辑销项发票' : '新建销项发票'}
      width={1200}
      open={visible}
      onValuesChange={handleValuesChange}
      onOpenChange={(vis) => {
        if (!vis) {
          attemptClose();
        }
      }}
      submitter={{
        render: () => [
          <Button key="cancel" onClick={attemptClose}>
            取消
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={isSubmitting}
            disabled={!isEditMode && !canSaveInvoice}
            onClick={() => handleSubmit(isEditMode)}
          >
            {isEditMode ? '提交' : canSaveInvoice ? '保存并继续' : '请填写必填项'}
          </Button>,
        ],
      }}
      drawerProps={{ destroyOnClose: true }}
      layout="horizontal"
    >
      <Spin spinning={loading}>
        <Row gutter={24}>
          <Col span={16}>
            <InvoiceFormFields<ContractOption>
              contractFieldName="main_contract_id"
              contractOptions={contractOptions}
              contractLoading={contractLoading}
              onContractSearch={handleContractSearch}
              onContractChange={handleContractChange}
            />
          </Col>
          <InvoiceFormAttachmentPanel
            isEditMode={isEditMode}
            effectiveId={effectiveId}
            moduleType="ZB_INVOICE"
            mainContractId={selectedMainContractId ?? undefined}
            formRef={formRef}
            fileUploaderRef={fileUploaderRef}
            onFilesChanged={markFilesDirty}
          />
        </Row>
      </Spin>
    </DrawerForm>
  );
};

export default InvoiceOutForm;
