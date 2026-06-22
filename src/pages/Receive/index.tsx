import type { ActionType } from '@ant-design/pro-components';
import { useSearchParams } from '@umijs/max';
import React, { useMemo, useRef, useState } from 'react';
import { pickSearchParams } from '@/utils/listSearchParams';
import ReceiveDetail from './ReceiveDetail';
import ReceiveForm from './ReceiveForm';
import ReceiveList from './ReceiveList';

const ReceivePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [currentRecord, setCurrentRecord] = useState<API.Receive | undefined>(undefined);
  const [formVisible, setFormVisible] = useState<boolean>(false);
  const [detailVisible, setDetailVisible] = useState<boolean>(false);
  const actionRef = useRef<ActionType>();

  const initialFilters = useMemo(
    () => pickSearchParams(searchParams, ['receive_status']),
    [searchParams],
  );

  const handleViewDetail = async (record: API.Receive) => {
    setFormVisible(false);
    setCurrentRecord(record);
    setDetailVisible(true);
  };

  const handleEdit = (record: API.Receive) => {
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
      <ReceiveList
        actionRef={actionRef}
        onViewDetail={handleViewDetail}
        onEdit={handleEdit}
        onCreate={handleCreate}
        initialFilters={initialFilters}
      />
      <ReceiveForm
        visible={formVisible}
        currentRecord={currentRecord}
        onCancel={handleFormCancel}
        onSuccess={handleFormSuccess}
      />
      <ReceiveDetail
        visible={detailVisible}
        currentRecord={currentRecord}
        onCancel={handleDetailCancel}
      />
    </>
  );
};

export default ReceivePage;
