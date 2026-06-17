import React, { useRef, useState } from 'react';

import type { ActionType } from '@ant-design/pro-components';
import InvoiceOutDetail from './InvoiceOutDetail';
import InvoiceOutForm from './InvoiceOutForm';
import InvoiceOutList from './InvoiceOutList';

const InvoiceOutPage: React.FC = () => {
  const [formVisible, setFormVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<API.InvoiceOut>();
  const actionRef = useRef<ActionType>();

  const handleCreate = () => {
    setCurrentRecord(undefined);
    setFormVisible(true);
  };

  const handleEdit = (record: API.InvoiceOut) => {
    setCurrentRecord(record);
    setDetailVisible(false); // 关闭详情弹窗（从详情页编辑入口进入时确保关闭）
    setFormVisible(true);
  };

  const handleViewDetail = (record: API.InvoiceOut) => {
    setFormVisible(false);
    setCurrentRecord(record);
    setDetailVisible(true);
  };

  const handleFormClose = () => {
    setFormVisible(false);
    setCurrentRecord(undefined);
  };

  const handleDetailClose = () => {
    setDetailVisible(false);
    setCurrentRecord(undefined);
  };

  const handleSuccess = () => {
    handleFormClose();
    actionRef.current?.reload();
  };

  return (
    <>
      <InvoiceOutList
        actionRef={actionRef}
        onViewDetail={handleViewDetail}
        onEdit={handleEdit}
        onCreate={handleCreate}
      />

      <InvoiceOutForm
        visible={formVisible}
        currentRecord={currentRecord}
        onSuccess={handleSuccess}
        onCancel={handleFormClose}
      />

      <InvoiceOutDetail
        visible={detailVisible}
        currentRecord={currentRecord}
        onCancel={handleDetailClose}
      />
    </>
  );
};

export default InvoiceOutPage;
