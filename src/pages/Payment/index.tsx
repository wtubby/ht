import type { ActionType } from '@ant-design/pro-components';
import React, { useRef, useState } from 'react';
import PaymentDetail from './PaymentDetail';
import PaymentForm from './PaymentForm';
import PaymentList from './PaymentList';

const PaymentsPage: React.FC = () => {
  const [currentRecord, setCurrentRecord] = useState<API.Payment | undefined>(undefined);
  const [formVisible, setFormVisible] = useState<boolean>(false);
  const [detailVisible, setDetailVisible] = useState<boolean>(false);
  const actionRef = useRef<ActionType>();

  const handleViewDetail = async (record: API.Payment) => {
    setFormVisible(false);
    setCurrentRecord(record);
    setDetailVisible(true);
  };

  const handleEdit = (record: API.Payment) => {
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
      <PaymentList
        actionRef={actionRef}
        onViewDetail={handleViewDetail}
        onEdit={handleEdit}
        onCreate={handleCreate}
      />
      <PaymentForm
        visible={formVisible}
        currentRecord={currentRecord}
        onCancel={handleFormCancel}
        onSuccess={handleFormSuccess}
      />
      <PaymentDetail
        visible={detailVisible}
        currentRecord={currentRecord}
        onCancel={handleDetailCancel}
      />
    </>
  );
};

export default PaymentsPage;
