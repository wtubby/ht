import type { ActionType } from '@ant-design/pro-components';
import { useSearchParams } from '@umijs/max';
import React, { useMemo, useRef, useState } from 'react';
import { pickSearchParams } from '@/utils/listSearchParams';
import SubContractDetail from './SubContractDetail';
import SubContractForm from './SubContractForm';
import SubContractList from './SubContractList';

const SubContractsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [currentRecord, setCurrentRecord] = useState<API.SubContract | undefined>(undefined);
  const [formVisible, setFormVisible] = useState<boolean>(false);
  const [detailVisible, setDetailVisible] = useState<boolean>(false);
  const actionRef = useRef<ActionType>();

  const initialFilters = useMemo(
    () => pickSearchParams(searchParams, ['contract_status', 'contract_type']),
    [searchParams],
  );

  const handleViewDetail = (record: API.SubContract) => {
    if (!record.id) return;
    setFormVisible(false);
    setCurrentRecord(record);
    setDetailVisible(true);
  };

  const handleEdit = (record: API.SubContract) => {
    if (!record.id) return;
    setDetailVisible(false);
    setCurrentRecord(record);
    setFormVisible(true);
  };

  const handleCreate = () => {
    setCurrentRecord(undefined);
    setFormVisible(true);
  };

  const handleFormCancel = () => {
    setFormVisible(false);
    setCurrentRecord(undefined);
  };

  const handleFormSuccess = () => {
    handleFormCancel();
    actionRef.current?.reload();
  };

  const handleDetailCancel = () => {
    setDetailVisible(false);
    setCurrentRecord(undefined);
  };

  return (
    <>
      <SubContractList
        actionRef={actionRef}
        onViewDetail={handleViewDetail}
        onEdit={handleEdit}
        onCreate={handleCreate}
        initialFilters={initialFilters}
      />
      <SubContractForm
        visible={formVisible}
        currentRecord={currentRecord}
        onCancel={handleFormCancel}
        onSuccess={handleFormSuccess}
      />
      <SubContractDetail
        visible={detailVisible}
        currentRecord={currentRecord}
        onCancel={handleDetailCancel}
      />
    </>
  );
};

export default SubContractsPage;
