import type { ActionType } from '@ant-design/pro-components';
import { useSearchParams } from '@umijs/max';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { pickSearchParams } from '@/utils/listSearchParams';
import MainContractDetail from './MainContractDetail';
import MainContractForm from './MainContractForm';
import MainContractList from './MainContractList';

const MainContractsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const actionRef = useRef<ActionType>();
  const [currentRecord, setCurrentRecord] = useState<API.MainContract | undefined>(undefined);
  const [formVisible, setFormVisible] = useState<boolean>(false);
  const [detailVisible, setDetailVisible] = useState<boolean>(false);

  const initialFilters = useMemo(
    () => pickSearchParams(searchParams, ['contract_status']),
    [searchParams],
  );

  useEffect(() => {
    const contractId = searchParams.get('contract_id');
    if (!contractId) return;

    setCurrentRecord({ id: Number(contractId) } as API.MainContract);
    setDetailVisible(true);

    const next = new URLSearchParams(searchParams);
    next.delete('contract_id');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleViewDetail = (record: API.MainContract) => {
    if (!record.id) return;
    setFormVisible(false);
    setCurrentRecord(record);
    setDetailVisible(true);
  };

  const handleEdit = (record: API.MainContract) => {
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
      <MainContractList
        actionRef={actionRef}
        onViewDetail={handleViewDetail}
        onEdit={handleEdit}
        onCreate={handleCreate}
        initialFilters={initialFilters}
      />
      <MainContractForm
        visible={formVisible}
        currentRecord={currentRecord}
        onCancel={handleFormCancel}
        onSuccess={handleFormSuccess}
      />
      <MainContractDetail
        visible={detailVisible}
        currentRecord={currentRecord}
        onCancel={handleDetailCancel}
      />
    </>
  );
};

export default MainContractsPage;
