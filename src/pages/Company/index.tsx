import type { ActionType } from '@ant-design/pro-components';
import React, { useRef, useState } from 'react';
import CompanyDetail, { type CompanyDetailTabKey } from './CompanyDetail';
import CompanyForm from './CompanyForm';
import CompanyList from './CompanyList';

const CompanyPage: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const [currentRecord, setCurrentRecord] = useState<API.Company | undefined>(undefined);
  const [formVisible, setFormVisible] = useState<boolean>(false);
  const [detailVisible, setDetailVisible] = useState<boolean>(false);
  const [detailInitialTab, setDetailInitialTab] = useState<CompanyDetailTabKey>('basic');

  const handleViewDetail = (record: API.Company, tab: CompanyDetailTabKey = 'basic') => {
    if (!record.id) return;
    setFormVisible(false);
    setDetailInitialTab(tab);
    setCurrentRecord(record);
    setDetailVisible(true);
  };

  const handleEdit = (record: API.Company) => {
    if (!record.id) return;
    setDetailVisible(false);
    setDetailInitialTab('basic');
    setCurrentRecord(record);
    setFormVisible(true);
  };

  const handleEditFromDetail = () => {
    if (!currentRecord?.id) return;
    setDetailVisible(false);
    setDetailInitialTab('basic');
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
    setDetailInitialTab('basic');
    setCurrentRecord(undefined);
  };

  return (
    <>
      <CompanyList
        actionRef={actionRef}
        onViewDetail={handleViewDetail}
        onEdit={handleEdit}
        onCreate={handleCreate}
      />
      <CompanyForm
        visible={formVisible}
        currentRecord={currentRecord}
        onCancel={handleFormCancel}
        onSuccess={handleFormSuccess}
        onOpenDetail={(tab) => {
          if (!currentRecord?.id) return;
          setFormVisible(false);
          setDetailInitialTab(tab);
          setDetailVisible(true);
        }}
      />
      <CompanyDetail
        visible={detailVisible}
        currentRecord={currentRecord}
        initialActiveTab={detailInitialTab}
        onCancel={handleDetailCancel}
        onEdit={handleEditFromDetail}
      />
    </>
  );
};

export default CompanyPage;
