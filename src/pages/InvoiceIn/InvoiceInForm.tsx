import type { BusinessFileUploaderRef } from '@/components/BusinessFileUploader';
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
import { getSelectOptions as getInvoiceInSelectOptions } from '@/services/wtu/invoiceIn.api';
import { selectApiDetail, getSavedEntityId } from '@/utils/apiResponse';
import {
  fetchInvoiceInQuery,
  fetchSubContractQuery,
  useAddInvoiceIn,
  useDrawerDetailQuery,
  useDrawerFormLifecycle,
  useDrawerSaveSubmit,
  useInvoiceInSelectOptions,
  useUpdateInvoiceIn,
} from '@/hooks';
import type { ProFormInstance } from '@ant-design/pro-components';
import { DrawerForm } from '@ant-design/pro-components';
import { useQueryClient } from '@tanstack/react-query';
import { App, Button, Col, Row, Spin } from 'antd';
import React, { useCallback, useRef, useState } from 'react';

interface InvoiceInFormProps {
  visible: boolean;
  currentRecord?: API.InvoiceIn;
  onSuccess: () => void;
  onCancel: () => void;
}

interface ContractOption {
  label: string;
  value: number;
  contract_name: string;
  mainContract?: { id: number };
  partyB?: API.Company;
  partyC?: API.Company;
}

interface InvoiceInPayload extends ReturnType<typeof buildInvoiceCommonPayload> {
  sub_contract_id: number;
}

const toContractOption = (contract: API.SubContract): ContractOption => ({
  label: contract.contract_name || '未命名',
  value: contract.id!,
  mainContract: contract.mainContract ? { id: contract.mainContract.id } : undefined,
  contract_name: contract.contract_name,
  partyB: contract.partyB,
  partyC: contract.partyC,
});

const extractSubContracts = (response: { success?: boolean; data?: { subContracts?: unknown[] } }) =>
  response.data?.subContracts ?? [];

const selectInvoiceInDetail = (response: unknown) => selectApiDetail<API.InvoiceIn>(response);

const InvoiceInForm: React.FC<InvoiceInFormProps> = ({
  visible,
  currentRecord,
  onSuccess,
  onCancel,
}) => {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const addMutation = useAddInvoiceIn();
  const updateMutation = useUpdateInvoiceIn();
  const { data: selectOptionsResponse } = useInvoiceInSelectOptions({
    limit: INITIAL_CONTRACT_LIMIT,
  });
  const formRef = useRef<ProFormInstance>();
  const fileUploaderRef = useRef<BusinessFileUploaderRef>(null);
  const selectedSubContractIdRef = useRef<number | null>(null);
  const effectiveIdRef = useRef<number | null>(null);
  const hydratingRef = useRef(false);
  const visibleRef = useRef(visible);
  visibleRef.current = visible;

  const [newlyCreatedId, setNewlyCreatedId] = useState<number | null>(null);
  const effectiveId = currentRecord?.id ?? newlyCreatedId;
  const isEditMode = !!effectiveId;
  effectiveIdRef.current = effectiveId ?? null;

  const [selectedMainContractId, setSelectedMainContractId] = useState<number | null>(null);
  const [selectedSubContractId, setSelectedSubContractId] = useState<number | null>(null);
  const [canSaveInvoice, setCanSaveInvoice] = useState(false);

  const clearInvoiceFormState = useCallback(() => {
    setNewlyCreatedId(null);
    setSelectedMainContractId(null);
    setSelectedSubContractId(null);
    selectedSubContractIdRef.current = null;
    setCanSaveInvoice(false);
    formRef.current?.resetFields();
  }, []);

  const mapToOptions = useCallback(
    (contracts: unknown[]) =>
      (contracts as API.SubContract[])
        .filter((c): c is API.SubContract & { id: number } => c.id != null)
        .map(toContractOption),
    [],
  );

  const {
    contractLoading,
    contractOptions,
    setContractOptions,
    withContractLoading,
    handleContractSearch,
    runOpenEdgeInit,
  } = useInvoiceContractSelect({
    visible,
    currentRecordId: currentRecord?.id,
    effectiveId,
    selectedIdRef: selectedSubContractIdRef,
    visibleRef,
    message,
    preloadContracts: selectOptionsResponse?.success
      ? selectOptionsResponse.data?.subContracts
      : undefined,
    fetchOptions: getInvoiceInSelectOptions,
    extractContracts: extractSubContracts,
    mapToOptions,
    formRef,
    hydratingRef,
  });

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
    onReset: clearInvoiceFormState,
    onOpenEdge: handleOpenEdge,
    recordId: currentRecord?.id,
    onRecordSwitch: clearInvoiceFormState,
    hydratingRef,
    visibleRef,
  });

  const clearContractSelection = useCallback(() => {
    setSelectedMainContractId(null);
    setSelectedSubContractId(null);
    selectedSubContractIdRef.current = null;
  }, []);

  const { fetchContractById, handleContractChange } = useInvoiceFormContractLink<
    ContractOption,
    API.SubContract
  >({
    direction: 'in',
    contractFieldName: 'sub_contract_id',
    formRef,
    hydratingRef,
    visibleRef,
    fileUploaderRef,
    modal,
    message,
    queryClient,
    selectedContractIdRef: selectedSubContractIdRef,
    setContractOptions,
    withContractLoading,
    getContractQuery: fetchSubContractQuery,
    toOption: toContractOption,
    onContractFetched: (contract) => {
      if (contract.mainContract?.id) {
        setSelectedMainContractId(contract.mainContract.id);
      }
      const id = contract.id ?? null;
      setSelectedSubContractId(id);
      selectedSubContractIdRef.current = id;
    },
    onContractApplied: (value, option) => {
      setSelectedMainContractId(option.mainContract?.id ?? null);
      setSelectedSubContractId(value);
      selectedSubContractIdRef.current = value;
    },
    onContractCleared: clearContractSelection,
  });

  const applyInvoiceInDetail = useCallback(
    (data: API.InvoiceIn) => {
      applyInvoiceDetailToForm(formRef, hydratingRef, data);
      markFormClean();
      if (data.sub_contract_id) {
        void fetchContractById(data.sub_contract_id);
      }
    },
    [hydratingRef, markFormClean, fetchContractById],
  );

  const detailId = visible ? (effectiveId ?? undefined) : undefined;

  const handleDetailError = useCallback(() => {
    message.error('获取进项发票详情失败');
  }, [message]);

  const { isLoading: loading } = useDrawerDetailQuery({
    visible,
    detailId,
    getQuery: fetchInvoiceInQuery,
    select: selectInvoiceInDetail,
    onDetail: applyInvoiceInDetail,
    onError: handleDetailError,
  });

  const buildPayload = useCallback(
    (values: Record<string, unknown>): InvoiceInPayload => ({
      ...buildInvoiceCommonPayload(values),
      sub_contract_id: Number(values.sub_contract_id),
    }),
    [],
  );

  const { isSubmitting, handleSubmit } = useDrawerSaveSubmit({
    formRef,
    effectiveId: effectiveId ?? null,
    effectiveIdRef,
    setEffectiveId: setNewlyCreatedId,
    isActive,
    runIfMounted,
    buildPayload,
    add: (data) => addMutation.mutateAsync(data as API.InvoiceIn),
    update: (id, data) => updateMutation.mutateAsync({ id, data: data as API.InvoiceIn }),
    getSavedId: getSavedEntityId,
    markFormClean,
    notifySubmitSuccess,
    onSuccess,
    message,
    messages: {
      createLoading: '正在保存进项发票',
      updateLoading: '正在更新进项发票',
      continueSuccess: '进项发票保存成功',
      updateSuccess: '进项发票更新成功',
      closeCreateSuccess: '进项发票保存成功',
      closeUpdateSuccess: '进项发票更新成功',
    },
    onSubmitError: ({ error }) => mapInvoiceSubmitError(formRef, error),
  });

  const handleValuesChange = (_: Partial<API.InvoiceIn>, allValues: Record<string, unknown>) => {
    markFormDirtyIfNotHydrating();
    setCanSaveInvoice(isInvoiceRequiredFilled(allValues, 'sub_contract_id'));
  };

  return (
    <DrawerForm
      formRef={formRef}
      title={isEditMode ? '编辑进项发票' : '新建进项发票'}
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
              contractFieldName="sub_contract_id"
              contractOptions={contractOptions}
              contractLoading={contractLoading}
              onContractSearch={handleContractSearch}
              onContractChange={handleContractChange}
            />
          </Col>
          <InvoiceFormAttachmentPanel
            isEditMode={isEditMode}
            effectiveId={effectiveId}
            moduleType="FB_INVOICE"
            mainContractId={selectedMainContractId ?? undefined}
            subContractId={selectedSubContractId ?? undefined}
            formRef={formRef}
            fileUploaderRef={fileUploaderRef}
            onFilesChanged={markFilesDirty}
          />
        </Row>
      </Spin>
    </DrawerForm>
  );
};

export default InvoiceInForm;
