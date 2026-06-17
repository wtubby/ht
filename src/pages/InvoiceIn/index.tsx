import React, { useRef, useState } from 'react';

import type { ActionType } from '@ant-design/pro-components';
import InvoiceInDetail from './InvoiceInDetail';
import InvoiceInForm from './InvoiceInForm';
import InvoiceInList from './InvoiceInList';

const InvoiceInPage: React.FC = () => {
  const [formVisible, setFormVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<API.InvoiceIn>();
  const actionRef = useRef<ActionType>();

  const handleCreate = () => {
    setCurrentRecord(undefined);
    setFormVisible(true);
  };

  const handleEdit = (record: API.InvoiceIn) => {
    setCurrentRecord(record);
    setDetailVisible(false); // 关闭详情弹窗（从详情页编辑入口进入时确保关闭）
    setFormVisible(true);
  };

  const handleViewDetail = (record: API.InvoiceIn) => {
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
      <InvoiceInList
        actionRef={actionRef}
        onViewDetail={handleViewDetail}
        onEdit={handleEdit}
        onCreate={handleCreate}
      />

      <InvoiceInForm
        visible={formVisible}
        currentRecord={currentRecord}
        onSuccess={handleSuccess}
        onCancel={handleFormClose}
      />

      <InvoiceInDetail
        visible={detailVisible}
        currentRecord={currentRecord}
        onCancel={handleDetailClose}
      />
    </>
  );
};

export default InvoiceInPage;
